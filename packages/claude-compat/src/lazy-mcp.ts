/**
 * Session-scoped lazy MCP loading.
 *
 * A deployment keeps MCP servers out of every request's tool list — and out of
 * the prompt — by leaving their composition rows disabled, then pulls one in on
 * demand. Three small tools are registered once:
 *
 * - `mcp_list` names every configured MCP server and whether it is running;
 * - `mcp_load` mounts one server into the CALLING AGENT's scope, so its tools
 *   register for that session only;
 * - `mcp_unload` disposes that mount and shrinks the catalog again.
 *
 * The mounted client's tools live in the agent's own scope and unwind with it,
 * so a server loaded in one session never leaks into another.
 * @module @zhang-guo-wen/dsh-claude-compat/lazy-mcp
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { MCP_CLIENT_MODULE } from './mcp-authoring.ts'
import { mcpEntryConfig } from './mcp-config.ts'
import type { McpSpec, McpTarget } from './types.ts'

/** One configured mcp-client row and where its composition lives. */
interface McpRow {
  readonly target: McpTarget
  readonly entryId: string
  readonly serverName: string
  readonly scopeLabel: string
  readonly enabled: boolean
}

/** The mcp-client host plugin object, resolved from the harness module graph. */
interface McpClientModule {
  readonly name: string
  readonly inject: readonly string[]
  apply(ctx: Context, config: unknown): void | Promise<void>
}

/** One live per-agent mount. */
interface MountedServer {
  dispose(): Promise<void>
}

/** The tool registry surface this module uses. */
interface ToolRegistry {
  register(definition: unknown): () => void
  schemas(scope?: unknown): readonly { readonly name: string }[]
}

/** The last `:`-separated segment of a loader-qualified row id. */
function leafId(id: string): string {
  const separator = id.lastIndexOf(':')
  return separator < 0 ? id : id.slice(separator + 1)
}

/** The base URL bare package specifiers resolve against, when the Loader exposes one. */
function harnessBase(ctx: Context): string | undefined {
  return (ctx as unknown as { baseUrl?: string }).baseUrl
}

/**
 * Resolve the mcp-client plugin object from the Loader's module graph so it is
 * the same module instance the composition mounts (its `serverName` reservation
 * is module state). Falls back to a plain dynamic import.
 * @param ctx - host context carrying the Loader.
 * @returns the mcp-client host plugin object.
 */
async function resolveMcpClient(ctx: Context): Promise<McpClientModule> {
  const loader = ctx.get('loader') as
    | { internal?: { import(spec: string, base: string, options: object): Promise<unknown> } }
    | undefined
  const base = harnessBase(ctx)
  if (loader?.internal !== undefined && base !== undefined) {
    try {
      const mod = await loader.internal.import(MCP_CLIENT_MODULE, base, {}) as McpClientModule
      if (typeof mod.apply === 'function') return mod
    } catch {
      // Swallows only the internal-resolver miss; the plain import below is the
      // fallback and reports its own failure if the package is absent.
    }
  }
  return await import('@deepseek-ai/dsh-mcp-client') as McpClientModule
}

/**
 * Every configured mcp-client row: the Loader's own entries (global plane) plus
 * each agent preset's composition rows.
 * @param ctx - host context carrying the Loader and, in the web profile, the roster.
 * @returns the rows in Loader order, then roster order.
 */
async function listRows(ctx: Context): Promise<McpRow[]> {
  const rows: McpRow[] = []
  const loader = ctx.get('loader') as
    | { entries(): Iterable<{ id: string; disabled?: boolean; options: { name?: string; group?: boolean } }> }
    | undefined
  for (const entry of loader?.entries() ?? []) {
    if (entry.options.group === true || entry.options.name !== MCP_CLIENT_MODULE) continue
    rows.push({
      target: { scope: 'global' },
      entryId: entry.id,
      serverName: leafId(entry.id),
      scopeLabel: 'global',
      enabled: entry.disabled !== true,
    })
  }
  const presets = ctx.get('agentPresets') as
    | {
      compositionInventory(): Promise<readonly {
        readonly id: string
        readonly rows: readonly { readonly entryId: string | null; readonly moduleName: string; readonly enabled: boolean | 'conditional' }[]
      }[]>
    }
    | undefined
  if (presets !== undefined) {
    for (const preset of await presets.compositionInventory()) {
      for (const row of preset.rows) {
        if (row.moduleName !== MCP_CLIENT_MODULE) continue
        const entryId = row.entryId ?? ''
        rows.push({
          target: { scope: 'preset', agentPreset: preset.id },
          entryId,
          serverName: leafId(entryId),
          scopeLabel: `preset ${preset.id}`,
          enabled: row.enabled === true,
        })
      }
    }
  }
  return rows
}

/** Read one row's connection spec through the authoring owner. */
async function describeRow(ctx: Context, row: McpRow): Promise<McpSpec> {
  const owner = ctx.get('claudeCompatMcp') as
    | { describeMcp(request: { target: McpTarget; entryId: string }): Promise<{ spec: McpSpec }> }
    | undefined
  if (owner === undefined) throw new Error('mcp_load requires the claudeCompatMcp service')
  return (await owner.describeMcp({ target: row.target, entryId: row.entryId })).spec
}

/** The tool names one server published into an agent's scope. */
function toolNamesFor(tools: ToolRegistry, agentCtx: Context, serverName: string): string[] {
  const prefix = `mcp__${serverName}__`
  return tools.schemas(scopeOf(agentCtx)).map(schema => schema.name).filter(name => name.startsWith(prefix))
}

const SERVER_ROW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true, description: 'MCP serverName namespace.' },
    scope: { type: 'string', required: true, description: 'Composition that owns the row, e.g. "global" or "preset standard".' },
    description: { type: 'string', required: true, description: 'Configured description, empty when none.' },
    loaded: { type: 'boolean', required: true, description: 'Whether the server is currently running for this session.' },
  },
} as const

/**
 * Register the three lazy-MCP tools on this host. A no-op when the deployment
 * has no tool registry.
 * @param ctx - host context (the same one that owns the MCP authoring service).
 */
export function registerLazyMcp(ctx: Context): void {
  const tools = ctx.get('tools') as ToolRegistry | undefined
  if (tools === undefined) return
  /** Loaded mounts keyed by agent id, then serverName. */
  const mounted = new Map<string, Map<string, MountedServer>>()

  const loadedFor = (agentId: string): Map<string, MountedServer> => {
    const existing = mounted.get(agentId)
    if (existing !== undefined) return existing
    const created = new Map<string, MountedServer>()
    mounted.set(agentId, created)
    return created
  }

  ctx.effect(() => () => {
    const pending: Promise<void>[] = []
    for (const perAgent of mounted.values()) for (const mount of perAgent.values()) pending.push(mount.dispose())
    mounted.clear()
    return Promise.allSettled(pending).then(() => undefined)
  }, 'claude-compat: lazy mcp teardown')

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_list',
    description:
      'List the MCP servers configured for this deployment, with their scope and whether each is currently '
      + 'running. Servers that are configured but not running can be started on demand with `mcp_load`; load '
      + 'only the ones you need, because a running server adds its tools to the request.',
    parameters: {},
    output: {
      schema: { type: 'array', items: SERVER_ROW_SCHEMA },
      render: (_args, rows) => [{
        type: 'text',
        text: rows.length === 0
          ? '(no MCP servers configured)'
          : rows.map(row => `${row.name} [${row.scope}] ${row.loaded ? 'running' : 'not loaded'}${row.description === '' ? '' : ` — ${row.description}`}`).join('\n'),
      }],
    },
    async execute(_args, exec) {
      const agentId = exec.agent?.id
      const running = agentId === undefined ? undefined : mounted.get(agentId)
      return (await listRows(ctx)).map(row => ({
        name: row.serverName,
        scope: row.scopeLabel,
        description: '',
        // A row the preset mounted eagerly is already running; one mounted by
        // `mcp_load` runs only for this session and lives in the map.
        loaded: row.enabled || running?.has(row.serverName) === true,
      }))
    },
  })), 'claude-compat: mcp_list')

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_load',
    description:
      'Start one configured but not-running MCP server for THIS session and add its tools to the request. '
      + 'Use `mcp_list` first to see the available names. Starting a server takes a few seconds; the tools it '
      + 'contributes are returned so you can call them directly afterwards.',
    parameters: {
      server: { type: 'string', required: true, description: 'The MCP serverName to start, as reported by mcp_list.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          server: { type: 'string', required: true },
          tools: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.tools.length === 0
          ? `Started MCP server "${value.server}"; it exposed no tools.`
          : `Started MCP server "${value.server}". New tools: ${value.tools.join(', ')}`,
      }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('mcp_load requires an owning agent session')
      const serverName = String((args as { server: string }).server)
      const already = loadedFor(agent.id).get(serverName)
      if (already !== undefined) return { server: serverName, tools: toolNamesFor(tools, agent.ctx, serverName) }
      const row = (await listRows(ctx)).find(candidate => candidate.serverName === serverName)
      if (row === undefined) throw new Error(`unknown MCP server "${serverName}" — call mcp_list for the configured names`)
      if (row.enabled) return { server: serverName, tools: toolNamesFor(tools, agent.ctx, serverName) }
      const spec = await describeRow(ctx, row)
      const mod = await resolveMcpClient(ctx)
      const plugin = { name: mod.name, inject: mod.inject, apply: mod.apply }
      const handle = await agent.ctx.plugin(plugin as never, mcpEntryConfig(spec, serverName) as never) as unknown as { dispose(): Promise<void> }
      loadedFor(agent.id).set(serverName, { dispose: async () => { await handle.dispose() } })
      return { server: serverName, tools: toolNamesFor(tools, agent.ctx, serverName) }
    },
  })), 'claude-compat: mcp_load')

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_unload',
    description:
      'Stop an MCP server that `mcp_load` started for THIS session and remove its tools from the request again. '
      + 'Use it when you are done with a server, to keep the tool list small.',
    parameters: {
      server: { type: 'string', required: true, description: 'The MCP serverName to stop.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          server: { type: 'string', required: true },
          stopped: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.stopped
          ? `Stopped MCP server "${value.server}".`
          : `MCP server "${value.server}" was not loaded for this session.`,
      }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('mcp_unload requires an owning agent session')
      const serverName = String((args as { server: string }).server)
      const mount = loadedFor(agent.id).get(serverName)
      if (mount === undefined) return { server: serverName, stopped: false }
      loadedFor(agent.id).delete(serverName)
      await mount.dispose()
      return { server: serverName, stopped: true }
    },
  })), 'claude-compat: mcp_unload')

}
