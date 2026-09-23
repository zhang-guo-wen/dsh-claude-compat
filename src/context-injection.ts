/**
 * Context-injection user settings: the three switches that decide which part of
 * the Claude Code compatibility surface this plugin applies — the skill
 * catalog, the memory files, and the scoped rules.
 *
 * The switches are this plugin's Loader row Config, so the profile entry id
 * (`claude-compat`) is the namespace the settings page addresses and the schema
 * below is the live form it renders. Each field is volatile, so a committed
 * change reaches the running plugin without a remount; the reader below always
 * observes the value as it stands at call time.
 *
 * A composition that wants a different starting point sets the same fields under
 * the row's `config:`, which the schema defaults sit beneath.
 *
 * @module @guowenzhang/dsh-claude-compat/context-injection
 */

import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by this plugin: its Loader row id. */
export const CONTEXT_INJECTION_NAMESPACE = 'claude-compat'

/** One independently switchable part of the compatibility surface. */
export type InjectionSwitch = 'skills' | 'rules' | 'memory'

/** The injection preferences this plugin publishes as live settings fields. */
export interface ContextInjectionFlags {
  /** Whether `.claude/skills` roots are added to the session skill catalog. */
  skills: Volatile<boolean>
  /** Whether `.claude/rules/**` scoped rules are folded into the request. */
  rules: Volatile<boolean>
  /** Whether the Claude Code memory files are folded into the request. */
  memory: Volatile<boolean>
}

/** Schema served to settings clients for the injection preferences.
 * The inferred type is the source of truth: `.volatile()` produces the `Volatile` accessors above. */
export const CONTEXT_INJECTION_SCHEMA = z.object({
  skills: z.boolean().default(true).volatile(),
  rules: z.boolean().default(true).volatile(),
  memory: z.boolean().default(true).volatile(),
})

/** Composition-layer defaults accepted under the row's `config:`. */
export interface ContextInjectionConfig {
  skills?: boolean
  rules?: boolean
  memory?: boolean
}

/** The three switches as plain values. */
export interface InjectionFlags {
  skills: boolean
  rules: boolean
  memory: boolean
}

/** A live {@link InjectionFlags} reader (detached snapshots). */
export type InjectionFlagsSource = () => InjectionFlags

/**
 * Read the three switches as plain values.
 *
 * The contributors call the returned thunk per request, so a committed change
 * needs no listener and no re-registration.
 * @param config - the plugin's resolved configuration.
 * @returns a thunk returning the switches as they stand at call time.
 */
export function contextInjectionFlags(config: ContextInjectionFlags): InjectionFlagsSource {
  return () => ({
    skills: config.skills.get(),
    rules: config.rules.get(),
    memory: config.memory.get(),
  })
}
