/**
 * Context-injection user settings: the three switches that decide which part of
 * the Claude Code compatibility surface this plugin applies — the skill
 * catalog, the memory files, and the scoped rules.
 *
 * The switches resolve through `ctx.settings` (the settings seam) so they are
 * user-editable in a local document and persist across restarts, falling back
 * to composition `base` values (from the plugin `config`) when the user has not
 * overridden them. The settings service is optional: without one mounted, the
 * reader stays pinned to the composition `base`.
 *
 * This file deliberately accesses `ctx.settings` through a small local
 * interface rather than a hard dependency on the settings package, so this
 * package stays composable in trees that do not mount the settings provider.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/context-injection
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'

/** Settings namespace owned by this plugin. */
export const CONTEXT_INJECTION_NAMESPACE = 'context-injection'

/** One independently switchable part of the compatibility surface. */
export type InjectionSwitch = 'skills' | 'rules' | 'memory'

/** The settings this plugin surfaces to the settings UI. */
export interface ContextInjectionFlags {
  /** Whether `.claude/skills` roots are added to the session skill catalog. */
  skills: boolean
  /** Whether `.claude/rules/**` scoped rules are folded into the request. */
  rules: boolean
  /** Whether the Claude Code memory files are folded into the request. */
  memory: boolean
}

/** Schema served to settings clients for the injection preferences. */
export const CONTEXT_INJECTION_SCHEMA: Schema<ContextInjectionFlags> = z.object({
  skills: z.boolean().default(true),
  rules: z.boolean().default(true),
  memory: z.boolean().default(true),
})

/** Composition-layer defaults for the switches when a plugin uses them. */
export type ContextInjectionConfig = Partial<ContextInjectionFlags>

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
 * @param config - composition defaults for the three switches.
 * @returns a thunk returning the current flags.
 */
export function registerContextInjection(
  ctx: Context,
  config: ContextInjectionConfig = {},
): InjectionFlagsSource {
  const base: ContextInjectionFlags = {
    skills: config.skills ?? true,
    rules: config.rules ?? true,
    memory: config.memory ?? true,
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
      })
    } catch {
      // Another owner already registered this namespace; keep our base.
    }
  })
  return () => ({ ...source() })
}
