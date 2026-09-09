/**
 * Controller bridging the Host `context-injection` settings namespace onto the
 * Harness-compat section snapshot. Reads the current flags and the user system
 * prompt, writes one field per toggle or the system prompt through the settings
 * scope, and supplies the MCP server roster the MCP tab renders.
 *
 * The MCP roster comes from the already-wired `remote.pluginInventory` read of
 * the Loader (loaded from the deployment and preset config files), so it is
 * real-time and reflects both the global plane and every agent-preset
 * composition. Every mcp-client occurrence is surfaced without deduplication,
 * tagged with where it is configured (`global` or a preset id). Descriptions are
 * plugin-owned: stored in the `context-injection` namespace's `mcpDescriptions`
 * map and merged onto the rows by the component.
 * @module @deepseek-ai/dsh-client-ui-context-injection/settings-controller
 */

import type {
  AddMcpRequest,
  DisableMcpRequest,
  EditMcpRequest,
  McpMutationResult,
  PluginInventorySnapshot,
} from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'

/** Settings namespace registered Host-side by @deepseek-ai/dsh-claude-compat. */
export const CONTEXT_INJECTION_NS = 'context-injection'

/** Module specifier of the MCP client bridge whose instances this section lists. */
export const MCP_CLIENT_MODULE = '@deepseek-ai/dsh-mcp-client'

/** Lifecycle phase of one mcp-client Loader entry (same vocabulary as the inventory). */
export type McpPhase = PluginInventorySnapshot['entries'][number]['fiberPhase']

/** Stable key for a plugin-owned MCP description (`<scope>:<name>` or `preset:<id>:<name>`). */
export function mcpDescriptionKey(server: McpServer): string {
  return server.scope === 'preset' ? `preset:${server.presetId ?? ''}:${server.serverName}` : `${server.scope}:${server.serverName}`
}

/**
 * The local Loader row id from a loader-qualified id. A global mcp-client row
 * is addressed as `<includePath>:<id>`, and the host writes `serverName` into
 * the row's config; in the default add flow the local id equals that name.
 * @param qualified - loader-qualified entry id.
 * @returns the id segment after the last `:` separator.
 */
function localEntryId(qualified: string): string {
  const separator = qualified.lastIndexOf(':')
  return separator < 0 ? qualified : qualified.slice(separator + 1)
}

/** One loaded MCP server, as the MCP management tab presents it. */
export interface McpServer {
  /** Loader entry id, or null when a preset row declares no id. */
  entryId: string | null
  /** MCP namespace shown in tool names. */
  serverName: string
  /** Authoring description; plugin-owned, resolved by the section from `mcpDescriptions`. */
  description?: string
  /** Where this occurrence is configured. */
  scope: 'global' | 'preset'
  /** Preset id when `scope` is `preset`. */
  presetId: string | undefined
  /** Effective enablement; `'conditional'` marks a `!!js` gate only a mount can resolve. */
  enabled: boolean | 'conditional'
  /** Root-fiber phase when live, otherwise null. */
  fiberPhase: McpPhase
}

/** The two master toggles, the user system prompt, and the MCP description map. */
export interface ContextInjectionFlags {
  claude: boolean
  codex: boolean
  systemPrompt: string
  mcpDescriptions: Record<string, string>
}

/** Host-authoring callbacks projected into the MCP management section. */
export interface McpAuthoringActions {
  /** Add one MCP row and resolve after the Host commits it. */
  addMcp: (request: AddMcpRequest) => Promise<McpMutationResult>
  /** Replace one MCP row and resolve after the Host commits it. */
  editMcp: (request: EditMcpRequest) => Promise<McpMutationResult>
  /** Set one MCP row's disabled flag and resolve after the Host commits it. */
  disableMcp: (request: DisableMcpRequest) => Promise<McpMutationResult>
}

/** Snapshot the section renders. */
export interface ContextInjectionSectionState {
  /** Whether the namespace is exposed to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  claude: boolean
  codex: boolean
  systemPrompt: string
  /** Plugin-owned MCP row descriptions keyed by {@link mcpDescriptionKey}. */
  mcpDescriptions: Record<string, string>
}

/** Registration-side face for the section. */
export interface ContextInjectionSectionFace {
  hooks: {
    /** Section snapshot bound by the renderer as useContextInjection. */
    contextInjection: SnapshotStore<ContextInjectionSectionState>
  }
  /** Flip one master toggle. */
  toggle: (name: 'claude' | 'codex') => void
  /** Persist the system prompt text the user committed. */
  updateSystemPrompt: (value: string) => void
  /** Persist one MCP row's description. */
  updateMcpDescription: (key: string, description: string) => void
  /** Add one MCP row through the Claude-compatible Host Remote. */
  addMcp: (request: AddMcpRequest) => Promise<McpMutationResult>
  /** Edit one MCP row through the Claude-compatible Host Remote. */
  editMcp: (request: EditMcpRequest) => Promise<McpMutationResult>
  /** Enable or disable one MCP row through the Claude-compatible Host Remote. */
  disableMcp: (request: DisableMcpRequest) => Promise<McpMutationResult>
  /** Resolve the current loaded MCP roster from the Host plugin inventory. */
  mcps: () => Promise<readonly McpServer[]>
}

/**
 * Project a Host plugin-inventory snapshot onto the MCP roster, keeping every
 * mcp-client occurrence (global plane plus each preset composition) without
 * deduplicating cross-scope repeats. Descriptions are not read here — they are
 * plugin-owned and merged by the section from the `mcpDescriptions` map.
 * @param snapshot - the load-time inventory read from the Host.
 * @returns one row per mcp-client occurrence, tagged with its config scope.
 */
export function mapMcpServers(snapshot: PluginInventorySnapshot): readonly McpServer[] {
  const rows: McpServer[] = []
  for (const entry of snapshot.entries) {
    if (entry.moduleName !== MCP_CLIENT_MODULE) continue
    rows.push({
      entryId: entry.entryId,
      serverName: localEntryId(entry.entryId),
      scope: 'global',
      presetId: undefined,
      enabled: entry.enabled,
      fiberPhase: entry.fiberPhase,
    })
  }
  for (const preset of snapshot.agentPresets ?? []) {
    for (const row of preset.rows) {
      if (row.moduleName !== MCP_CLIENT_MODULE) continue
      rows.push({
        entryId: row.entryId,
        serverName: localEntryId(row.entryId ?? row.moduleName),
        scope: 'preset',
        presetId: preset.id,
        enabled: row.enabled,
        fiberPhase: row.fiberPhase,
      })
    }
  }
  return rows
}

/** Owner handle over the `context-injection` namespace. */
export class ContextInjectionController {
  private readonly store: SnapshotStore<ContextInjectionSectionState>
  private readonly unsubscribe: () => void

  /**
   * @param scope - bound `context-injection` settings scope.
   * @param mcps - Host-backed MCP roster loader.
   * @param authoring - Host-backed MCP mutation callbacks.
   */
  constructor(
    private readonly scope: SettingsScope<ContextInjectionFlags>,
    private readonly mcps: () => Promise<readonly McpServer[]>,
    private readonly authoring: McpAuthoringActions,
  ) {
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = scope.subscribe(() => this.publish())
  }

  /** Stop observing settings. */
  dispose(): void {
    this.unsubscribe()
  }

  /** Build the renderer face for this section. */
  inject(): ContextInjectionSectionFace {
    return {
      hooks: { contextInjection: this.store },
      toggle: (name) => { this.toggle(name) },
      updateSystemPrompt: (value) => { this.updateSystemPrompt(value) },
      updateMcpDescription: (key, description) => { this.updateMcpDescription(key, description) },
      addMcp: this.authoring.addMcp,
      editMcp: this.authoring.editMcp,
      disableMcp: this.authoring.disableMcp,
      mcps: this.mcps,
    }
  }

  private toggle(name: 'claude' | 'codex'): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    const value = snapshot.value?.[name]
    if (value === undefined) return
    void this.scope.set(name, !value)
  }

  private updateSystemPrompt(value: string): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    void this.scope.set('systemPrompt', value)
  }

  private updateMcpDescription(key: string, description: string): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    const map = snapshot.value?.mcpDescriptions ?? {}
    const next = { ...map }
    if (description === '') Reflect.deleteProperty(next, key)
    else next[key] = description
    void this.scope.set('mcpDescriptions', next)
  }

  private projection(): ContextInjectionSectionState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      claude: snapshot.value?.claude ?? true,
      codex: snapshot.value?.codex ?? true,
      systemPrompt: snapshot.value?.systemPrompt ?? '',
      mcpDescriptions: snapshot.value?.mcpDescriptions ?? {},
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
