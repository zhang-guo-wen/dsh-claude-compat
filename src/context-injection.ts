/**
 * Context-injection user settings: the two master toggles that decide whether
 * the compatibility loaders fold external agent rule files into the first
 * request.
 *
 * One namespace (`context-injection`) owns both switches so the settings
 * surface can present them as one "Context injection" section: `claude` gates
 * the Claude Code rule files (`.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`) and
 * `codex` gates the Codex rule files (`.codex/AGENTS.md`, `~/.codex/AGENTS.md`).
 *
 * The switches resolve through `ctx.settings` (the settings seam) so they are
 * user-editable in a local document and persist across restarts, falling back
 * to a composition `base` (from the plugin `config`) when the user has not
 * overridden them. The settings service is optional: without one mounted, the
 * reader stays pinned to the composition `base`.
 *
 * This file deliberately accesses `ctx.settings` through a small local
 * interface rather than a hard dependency on the settings package, so this
 * package stays composable in trees that do not mount the settings provider.
 *
 * @module @deepseek-ai/dsh-claude-compat/context-injection
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'

/** Settings namespace shared by the Claude and Codex loaders. */
export const CONTEXT_INJECTION_NAMESPACE = 'context-injection'

/** The two master toggles surfaced to the settings UI. */
export interface ContextInjectionFlags {
  /** Whether Claude Code rule files are folded into the first request. */
  claude: boolean
  /** Whether Codex rule files are folded into the first request. */
  codex: boolean
  /** User-authored system prompt embedded at the system level of a session. */
  systemPrompt: string
  /**
   * Authoring descriptions for MCP rows, keyed by `<scope>:<serverName>`
   * (`global:engram` or `preset:standard:mcp-github`). Plugin-owned display
   * metadata; never reaches the model or the config file.
   */
  mcpDescriptions: Record<string, string>
  /**
   * Per-row MCP tool filters, keyed as `mcpRowKey` (`<scope>:<serverName>`).
   * Each entry keeps matching tools and `!`-prefixed entries hide them; `*` and
   * `?` are wildcards. Applied when a session loads the server, so a hidden
   * tool is neither advertised nor callable.
   */
  mcpTools: Record<string, unknown>
  /**
   * How MCP servers load: `eager` (every enabled row mounts at preset mount),
   * `dynamic` (on-demand tools mount a server into the calling session) or
   * `lazy` (on-demand tools talk to the server without registering anything).
   */
  mcpLoading: string
}

/** Schema served to settings clients for the injection preference. */
export const CONTEXT_INJECTION_SCHEMA: Schema<ContextInjectionFlags> = z.object({
  claude: z.boolean().default(true),
  codex: z.boolean().default(true),
  systemPrompt: z.string().default(''),
  mcpDescriptions: z.dict(String).default({}),
  // Values stay unvalidated by the schema on purpose: the settings document is
  // hand-editable, and a malformed entry must fail that one row's filter at
  // read time instead of rejecting the whole namespace's stored section.
  mcpTools: z.dict(z.any()).default({}),
  mcpLoading: z.string().default('dynamic'),
})

/** Composition-layer defaults for the two toggles when a plugin uses them. */
export interface ContextInjectionConfig {
  /** Initial Claude state inherited when the user document does not override it. */
  claude?: boolean
  /** Initial Codex state inherited when the user document does not override it. */
  codex?: boolean
  /** Initial MCP loading mode inherited when the user document does not override it. */
  mcpLoading?: string
}

/** A live {@link ContextInjectionFlags} reader (detached snapshots). */
export type InjectionFlagsSource = () => ContextInjectionFlags

/**
 * Minimal local shape of the `settings.register` owner scope we consume. The
 * value types are the same as `@deepseek-ai/dsh-settings` exposes; declaring
 * them here keeps this package free of a hard reference to that service so it
 * can be composed even where the provider is absent.
 */
interface SettingsScopeLike<T> {
  get(): T
  watch(callback: (next: T, prev: T) => void): () => void
}

interface SettingsRegisterOptionsLike<T> {
  base?: Partial<T>
  applies?: 'live' | 'restart'
}

interface SettingsProviderLike {
  register<T>(
    namespace: string,
    schema: unknown,
    options?: SettingsRegisterOptionsLike<T>,
  ): SettingsScopeLike<T>
}

/**
 * Register the `context-injection` namespace and return a live reader.
 *
 * When the settings service is mounted, the namespace is registered and the
 * reader follows committed changes. Without a settings service the reader stays
 * pinned to the composition `base`. A namespace already owned by another plugin
 * keeps that owner's reader — we never throw.
 *
 * @param ctx - plugin context (uses `ctx.get('settings')` when present).
 * @param config - composition defaults for the two toggles.
 * @returns a thunk returning the current flags.
 */
export function registerContextInjection(
  ctx: Context,
  config: ContextInjectionConfig = {},
  onCommitted?: (flags: ContextInjectionFlags) => void,
): InjectionFlagsSource {
  const base: ContextInjectionFlags = {
    claude: config.claude ?? true,
    codex: config.codex ?? true,
    systemPrompt: '',
    mcpDescriptions: {},
    mcpTools: {},
    mcpLoading: config.mcpLoading ?? 'dynamic',
  }
  let source: InjectionFlagsSource = () => ({ ...base })
  ctx.inject(['settings'], (settingsCtx) => {
    const provider = (settingsCtx as unknown as { settings: SettingsProviderLike }).settings
    try {
      const scope = provider.register<ContextInjectionFlags>(
        CONTEXT_INJECTION_NAMESPACE,
        CONTEXT_INJECTION_SCHEMA,
        { base, applies: 'live' },
      )
      source = () => ({ ...scope.get() })
      scope.watch((next) => {
        source = () => ({ ...next })
        onCommitted?.({ ...next })
      })
    } catch {
      // Another owner already registered this namespace; keep our base.
    }
  })
  return () => ({ ...source() })
}
