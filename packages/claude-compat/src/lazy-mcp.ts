/**
 * On-demand MCP loading, in two modes.
 *
 * A deployment keeps MCP servers out of every request's tool list — and out of
 * the prompt — by leaving their composition rows disabled, then pulls one in
 * when it is actually needed. `mcp_list` names what is configured and what is
 * running; `mcp_load` starts one; `mcp_unload` stops it again.
 *
 * The mode decides how a loaded server reaches the model:
 *
 * - `dynamic` mounts the mcp-client into the CALLING AGENT's scope, so the
 *   server's tools register natively — best tool binding, but the tool list
 *   changes once per load.
 * - `lazy` talks to the MCP server over the SDK WITHOUT registering anything:
 *   `mcp_load` returns the tool schemas as its result and the model calls them
 *   through the fixed `mcp_call` proxy. The tool list never changes, so the
 *   request-cache prefix is never invalidated.
 * @module @zhang-guo-wen/dsh-claude-compat/lazy-mcp
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { MCP_CLIENT_MODULE } from './mcp-authoring.ts'
import { mcpEntryConfig, type McpEntryConfig } from './mcp-config.ts'
import type { McpSpec, McpTarget } from './types.ts'

/** How a configured-but-stopped MCP server reaches the model once loaded. */
export type McpLoadingMode = 'eager' | 'dynamic' | 'lazy'

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

/** One MCP tool as the lazy client reports it. */
interface LazyTool {
  readonly name: string
  readonly description?: string
  readonly inputSchema?: unknown
}

/** A live per-agent server. `dispose` releases whichever carrier started it. */
interface MountedServer {
  dispose(): Promise<void>
  /** Lazy carrier only: the connected SDK client and the tools it reported. */
  readonly client?: LazyClient
  readonly tools?: readonly LazyTool[]
}

/** The subset of the MCP SDK client this module uses. */
interface LazyClient {
  listTools(): Promise<{ tools?: readonly LazyTool[] }>
  callTool(request: { name: string; arguments: Record<string, unknown> }): Promise<unknown>
  close(): Promise<void>
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

/** Resolve the mcp-client plugin from the Loader's module graph (same instance the composition mounts). */
async function resolveMcpClient(ctx: Context): Promise<McpClientModule> {
  const loader = ctx.get('loader') as
    | { internal?: { import(spec: string, base: string, options: object): Promise<unknown> } }
    | undefined
  const base = (ctx as unknown as { baseUrl?: string }).baseUrl
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

/** Every configured mcp-client row: Loader entries (global) plus each agent preset's composition rows. */
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

/** The tool names one server published into an agent's scope (dynamic mode). */
function toolNamesFor(tools: ToolRegistry, agentCtx: Context, serverName: string): string[] {
  const prefix = `mcp__${serverName}__`
  return tools.schemas(scopeOf(agentCtx)).map(schema => schema.name).filter(name => name.startsWith(prefix))
}

/** Connect one configured server through the MCP SDK without registering anything. */
async function connectLazy(config: McpEntryConfig): Promise<{ client: LazyClient; tools: readonly LazyTool[] }> {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js') as {
    Client: new (info: { name: string; version: string }) => LazyClient & { connect(transport: unknown): Promise<void> }
  }
  let transport: unknown
  if (config.transport === 'stdio') {
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js') as {
      StdioClientTransport: new (options: Record<string, unknown>) => unknown
    }
    transport = new StdioClientTransport({
      command: config.command,
      args: [...config.args],
      env: { ...process.env, ...config.env },
      ...(config.cwd === '' ? {} : { cwd: config.cwd }),
      stderr: 'ignore',
    })
  } else {
    const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js') as {
      StreamableHTTPClientTransport: new (url: URL, options?: Record<string, unknown>) => unknown
    }
    transport = new StreamableHTTPClientTransport(
      new URL(config.url),
      Object.keys(config.headers).length === 0 ? {} : { requestInit: { headers: config.headers } },
    )
  }
  const client = new Client({ name: '@zhang-guo-wen/dsh-claude-compat', version: '0.1' })
  await client.connect(transport)
  const listed = await client.listTools()
  return { client, tools: listed.tools ?? [] }
}

const SERVER_ROW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', required: true, description: 'MCP serverName namespace.' },
    scope: { type: 'string', required: true, description: 'Composition that owns the row, e.g. "global" or "preset standard".' },
    loaded: { type: 'boolean', required: true, description: 'Whether the server is running for this session.' },
  },
} as const

/**
 * Register the on-demand MCP tools in one composition scope.
 * @param ctx - scope the tools belong to (a preset row's context).
 * @param mode - how a loaded server reaches the model.
 */
export function registerMcpTools(ctx: Context, mode: McpLoadingMode): void {
  if (mode !== 'eager' && mode !== 'dynamic' && mode !== 'lazy') {
    throw new Error(`claude-compat: unknown mcpLoading ${JSON.stringify(String(mode))} (expected eager | dynamic | lazy)`)
  }
  if (mode === 'eager') return
  const tools = ctx.get('tools') as ToolRegistry | undefined
  if (tools === undefined) return
  /** Loaded servers keyed by agent id, then serverName. */
  const mounted = new Map<string, Map<string, MountedServer>>()

  const loadedFor = (agentId: string): Map<string, MountedServer> => {
    const existing = mounted.get(agentId)
    if (existing !== undefined) return existing
    const created = new Map<string, MountedServer>()
    mounted.set(agentId, created)
    return created
  }

  const stopAll = async (): Promise<void> => {
    const pending: Promise<void>[] = []
    for (const perAgent of mounted.values()) for (const server of perAgent.values()) pending.push(server.dispose())
    mounted.clear()
    await Promise.allSettled(pending)
  }
  ctx.effect(() => () => stopAll().then(() => undefined), 'claude-compat: mcp tools teardown')

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_list',
    description:
      'List the MCP servers configured for this deployment, their scope, and whether each is running. '
      + 'Servers that are configured but not running can be started on demand with `mcp_load`; load only '
      + 'what you need, because a running server costs prompt tokens.',
    parameters: {},
    output: {
      schema: { type: 'array', items: SERVER_ROW_SCHEMA },
      render: (_args, rows) => [{
        type: 'text',
        text: rows.length === 0
          ? '(no MCP servers configured)'
          : rows.map(row => `${row.name} [${row.scope}] ${row.loaded ? 'running' : 'not loaded'}`).join('\n'),
      }],
    },
    async execute(_args, exec) {
      const running = exec.agent === undefined ? undefined : mounted.get(exec.agent.id)
      return (await listRows(ctx)).map(row => ({
        name: row.serverName,
        scope: row.scopeLabel,
        loaded: row.enabled || running?.has(row.serverName) === true,
      }))
    },
  })), 'claude-compat: mcp_list')

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_load',
    description: mode === 'lazy'
      ? 'Start one configured but not-running MCP server for THIS session and return its tools. Call the '
        + 'tools you need afterwards with `mcp_call`, passing the server name and tool name from this result.'
      : 'Start one configured but not-running MCP server for THIS session and add its tools to the request. '
        + 'Use `mcp_list` first to see the available names.',
    parameters: {
      server: { type: 'string', required: true, description: 'The MCP serverName to start, as reported by mcp_list.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          server: { type: 'string', required: true },
          tools: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                description: { type: 'string', required: true },
                schema: { type: 'string', required: true, description: 'JSON schema of the tool arguments, empty when the server declared none.' },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.tools.length === 0
          ? `Started MCP server "${value.server}"; it exposed no tools.`
          : `Started MCP server "${value.server}".\n`
            + value.tools.map(tool => `- ${tool.name}: ${tool.description}${tool.schema === '' ? '' : `\n  args: ${tool.schema}`}`).join('\n'),
      }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('mcp_load requires an owning agent session')
      const serverName = String((args as { server: string }).server)
      const existing = loadedFor(agent.id).get(serverName)
      if (existing !== undefined) {
        return { server: serverName, tools: describeTools(existing) }
      }
      const row = (await listRows(ctx)).find(candidate => candidate.serverName === serverName)
      if (row === undefined) throw new Error(`unknown MCP server "${serverName}" — call mcp_list for the configured names`)
      const spec = await describeRow(ctx, row)
      const config = mcpEntryConfig(spec, serverName)
      if (mode === 'lazy') {
        const { client, tools: listed } = await connectLazy(config)
        loadedFor(agent.id).set(serverName, {
          dispose: async () => { await client.close() },
          client,
          tools: listed,
        })
        return { server: serverName, tools: listed.map(lazyTool) }
      }
      const mod = await resolveMcpClient(ctx)
      const plugin = { name: mod.name, inject: mod.inject, apply: mod.apply }
      const handle = await agent.ctx.plugin(plugin as never, config as never) as unknown as { dispose(): Promise<void> }
      loadedFor(agent.id).set(serverName, { dispose: async () => { await handle.dispose() } })
      return {
        server: serverName,
        tools: toolNamesFor(tools, agent.ctx, serverName).map(name => ({ name, description: '', schema: '' })),
      }
    },
  })), 'claude-compat: mcp_load')

  if (mode === 'lazy') {
    ctx.effect(() => tools.register(defineTool({
      name: 'mcp_call',
      description:
        'Call one tool of an MCP server that `mcp_load` started for THIS session. Use the server and tool names '
        + 'from the mcp_load result; pass the tool arguments exactly as that result described them.',
      parameters: {
        server: { type: 'string', required: true, description: 'The MCP serverName, as reported by mcp_load.' },
        tool: { type: 'string', required: true, description: 'The tool name reported by mcp_load.' },
        arguments: { type: 'json', required: true, description: 'Arguments object for that tool, matching its reported schema.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            server: { type: 'string', required: true },
            tool: { type: 'string', required: true },
            text: { type: 'string', required: true, description: 'The tool result rendered as text.' },
            isError: { type: 'boolean', required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.text }],
      },
      async execute(args, exec) {
        const agent = exec.agent
        if (agent === undefined) throw new Error('mcp_call requires an owning agent session')
        const request = args as { server: string; tool: string; arguments: unknown }
        const mount = loadedFor(agent.id).get(request.server)
        if (mount?.client === undefined) {
          throw new Error(`MCP server "${request.server}" is not loaded — call mcp_load first`)
        }
        const result = await mount.client.callTool({
          name: request.tool,
          arguments: asRecord(request.arguments),
        })
        return {
          server: request.server,
          tool: request.tool,
          text: renderCallResult(result),
          isError: (result as { isError?: boolean } | null)?.isError === true,
        }
      },
    })), 'claude-compat: mcp_call')
  }

  ctx.effect(() => tools.register(defineTool({
    name: 'mcp_unload',
    description:
      'Stop an MCP server that `mcp_load` started for THIS session and release it again. Use it when you are '
      + 'done with a server, to keep the prompt small.',
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

/** One MCP tool projected onto the model-facing shape. */
function lazyTool(tool: LazyTool): { name: string; description: string; schema: string } {
  return {
    name: tool.name,
    description: tool.description ?? '',
    schema: tool.inputSchema === undefined ? '' : JSON.stringify(tool.inputSchema),
  }
}

/** The already-loaded server's tool list, re-reported without reconnecting. */
function describeTools(mount: MountedServer): { name: string; description: string; schema: string }[] {
  if (mount.tools === undefined) return []
  return mount.tools.map(lazyTool)
}

/** Coerce model-supplied arguments to the object the SDK expects. */
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

/** Render one MCP call result as text for the model. */
function renderCallResult(result: unknown): string {
  const content = (result as { content?: unknown } | null)?.content
  if (Array.isArray(content)) {
    const text = content
      .map(block => (block as { type?: string; text?: string }).type === 'text' ? (block as { text?: string }).text ?? '' : JSON.stringify(block))
      .filter(part => part !== '')
      .join('\n')
    if (text !== '') return text
  }
  return JSON.stringify(result)
}
