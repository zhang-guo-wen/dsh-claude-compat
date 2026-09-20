/**
 * Claude Code compatibility plugin (host) with a browser settings UI (client).
 *
 * Host: discovers Claude Code `.claude/skills`, loads its memory files (the
 * managed policy file, `~/.claude/CLAUDE.md`, every `CLAUDE.md`,
 * `.claude/CLAUDE.md`, and `CLAUDE.local.md` from the project root down to the
 * working directory, and the auto-memory index) with `@path` imports expanded,
 * folds `.claude/rules/**` including its `paths:`-scoped rules, and exposes the
 * `context-injection` settings namespace. It owns the two `CLAUDE.md` names
 * outright: the Harness `agent-instructions` loader's sections for them are
 * stripped from every request.
 * Client: `src/client` bundles the settings page into a `window.__ModuleLoader__`
 * handoff artifact served at `/plugins/<id>/client.js`.
 *
 * @module @zhang-guo-wen/dsh-claude-compat
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-skill'
import { ClaudeCodeSkillProvider, type Config as ProviderConfig } from './provider.ts'
import { claudeInstructionListener, type InstructionConfig } from './instructions.ts'
import { claudeRulesListener, type RulesConfig } from './rules.ts'
import {
  registerContextInjection,
  type ContextInjectionConfig,
} from './context-injection.ts'

export { instructionsSource, isInstructionsSource, PLUGIN_ID } from './sources.ts'
export { CONTEXT_INJECTION_NAMESPACE, registerContextInjection } from './context-injection.ts'
export type { ContextInjectionConfig, ContextInjectionFlags, InjectionFlagsSource } from './context-injection.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'claude-compat'

/** Services required by this plugin; `settings` is probed lazily. */
export const inject = ['skills']

/** Config forwarded to the provider, the memory contributor, the rule contributor, and the namespace. */
export interface Config
  extends ProviderConfig, InstructionConfig, RulesConfig, ContextInjectionConfig {}

export const Config: Schema<Config> = z.object({
  providerName: z.string().min(1).default('claude-code'),
  claudeHome: z.string(),
  projectRootMarkers: z.array(z.string()).default(['.git']),
  includeProjectRoot: z.boolean().default(true),
  includeGlobalRoot: z.boolean().default(true),
  includeProjectRule: z.boolean().default(true),
  includeGlobalRule: z.boolean().default(true),
  includeProjectRules: z.boolean().default(true),
  includeGlobalRules: z.boolean().default(true),
  includeNestedMemory: z.boolean().default(true),
  includeManagedMemory: z.boolean().default(true),
  managedMemoryPath: z.string(),
  includeAutoMemory: z.boolean().default(true),
  autoMemoryDirectory: z.string(),
  takeOverClaudeMd: z.boolean().default(true),
  maxRuleSourceBytes: z.number().step(1).min(1).default(1_048_576),
  maxRuleRenderBytes: z.number().step(1).min(0).default(262_144),
  maxMemorySourceBytes: z.number().step(1).min(1).default(4_194_304),
  maxMemoryRenderBytes: z.number().step(1).min(0).default(262_144),
  maxImportDepth: z.number().step(1).min(0).default(4),
  skills: z.boolean().default(true),
  rules: z.boolean().default(true),
  memory: z.boolean().default(true),
})

/**
 * Copy the configuration fields a listener reads, skipping the ones this
 * composition left unset: under `exactOptionalPropertyTypes` an optional
 * property does not accept an explicitly `undefined` value.
 * @param source - the plugin's validated configuration.
 * @param keys - the fields that listener owns.
 * @returns those fields, each present only when it has a value.
 */
function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): { [P in K]?: NonNullable<T[P]> } {
  const picked: Record<string, unknown> = {}
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined) picked[key as string] = value
  }
  return picked as { [P in K]?: NonNullable<T[P]> }
}

/**
 * Register the Claude Code skill provider, the memory and scoped-rule
 * contributors, and the `context-injection` namespace. Each of the three
 * follows its own settings switch.
 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const flags = registerContextInjection(ctx, config)
  ctx.skills.registerProvider(control => new ClaudeCodeSkillProvider(ctx, control, { ...config, enabled: () => flags().skills }))
  claudeInstructionListener(ctx, pickDefined(config, [
    'claudeHome',
    'projectRootMarkers',
    'includeProjectRule',
    'includeGlobalRule',
    'includeNestedMemory',
    'includeManagedMemory',
    'managedMemoryPath',
    'includeAutoMemory',
    'autoMemoryDirectory',
    'takeOverClaudeMd',
    'maxMemorySourceBytes',
    'maxMemoryRenderBytes',
    'maxImportDepth',
  ]), () => flags().memory)
  claudeRulesListener(ctx, pickDefined(config, [
    'claudeHome',
    'projectRootMarkers',
    'includeProjectRules',
    'includeGlobalRules',
    'maxRuleSourceBytes',
    'maxRuleRenderBytes',
  ]), () => flags().rules)
}
