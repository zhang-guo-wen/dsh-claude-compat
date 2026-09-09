/**
 * Combined Claude Code compatibility plugin (host) with a browser settings UI (client).
 *
 * Host: discovers Claude Code `.claude/skills` / `CLAUDE.md` / `.claude/rules/**` and
 * Codex `AGENTS.md`, exposes the `context-injection` settings namespace, and registers
 * the `/btw` side-question command (forked continuable child subagent).
 * Client: `src/client` bundles the settings page into a `window.__ModuleLoader__`
 * handoff artifact served at `/plugins/<id>/client.js`.
 *
 * @module @zhang-guo-wen/dsh-claude-compat
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-skill'
import type SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { ClaudeCodeSkillProvider, type Config as ProviderConfig } from './provider.ts'
import { claudeInstructionListener, type InstructionConfig } from './instructions.ts'
import { codexInstructionListener } from './codex.ts'
import { claudeRulesListener, type RulesConfig } from './rules.ts'
import {
  registerContextInjection,
  type ContextInjectionConfig,
} from './context-injection.ts'
import { apply as commandBtwApply } from './command-btw.ts'
import { ClaudeCompatMcp } from './mcp-remote.ts'

export { ClaudeCompatMcp } from './mcp-remote.ts'
export { assertServerName, mcpEntryConfig, specFromEntryConfig } from './mcp-config.ts'
export type { McpEntryConfig, McpTransportConfig, McpSpec, McpTarget } from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'claude-compat'

/** Services required by this plugin. `systemPrompt` and `settings` are probed lazily. */
export const inject = ['skills', 'commands', 'sessionProjections', 'subagents']

/** Config forwarded to the provider, both instruction contributors, the rule contributor, the namespace, and `/btw`. */
export interface Config
  extends ProviderConfig, InstructionConfig, RulesConfig, ContextInjectionConfig {
  /** Codex home; defaults to `$CODEX_HOME` or `~/.codex`. */
  codexHome?: string
  /** Maximum UTF-8 bytes in the `/btw` side question. */
  maxQuestionBytes?: number
  /** The `ctx.subagents` fork provider name (default `fork`). */
  provider?: string
}

export const Config: Schema<Config> = z.object({
  providerName: z.string().min(1).default('claude-code'),
  claudeHome: z.string(),
  codexHome: z.string(),
  projectRootMarkers: z.array(z.string()).default(['.git']),
  includeProjectRoot: z.boolean().default(true),
  includeGlobalRoot: z.boolean().default(true),
  includeProjectRule: z.boolean().default(true),
  includeGlobalRule: z.boolean().default(true),
  includeProjectRules: z.boolean().default(true),
  includeGlobalRules: z.boolean().default(true),
  maxRuleSourceBytes: z.number().step(1).min(1).default(1_048_576),
  maxRuleRenderBytes: z.number().step(1).min(0).default(262_144),
  claude: z.boolean().default(true),
  codex: z.boolean().default(true),
  maxQuestionBytes: z.number().step(1).min(1).default(4096),
  provider: z.string().min(1).default('fork'),
})

/**
 * Register the Claude Code skill provider and instruction/rule contributors,
 * the `context-injection` namespace, and the `/btw` command.
 */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const flags = registerContextInjection(ctx, config)
  ctx.skills.registerProvider(control => new ClaudeCodeSkillProvider(ctx, control, { ...config, enabled: () => flags().claude }))
  claudeInstructionListener(ctx, config, () => flags().claude)
  const ruleConfig = {
    ...config.claudeHome !== undefined ? { claudeHome: config.claudeHome } : {},
    ...config.projectRootMarkers !== undefined ? { projectRootMarkers: config.projectRootMarkers } : {},
    ...config.includeProjectRules !== undefined ? { includeProjectRules: config.includeProjectRules } : {},
    ...config.includeGlobalRules !== undefined ? { includeGlobalRules: config.includeGlobalRules } : {},
    ...config.maxRuleSourceBytes !== undefined ? { maxRuleSourceBytes: config.maxRuleSourceBytes } : {},
    ...config.maxRuleRenderBytes !== undefined ? { maxRuleRenderBytes: config.maxRuleRenderBytes } : {},
  }
  claudeRulesListener(ctx, ruleConfig, () => flags().claude)
  const codexConfig = {
    ...config.codexHome !== undefined ? { codexHome: config.codexHome } : {},
    ...config.projectRootMarkers !== undefined ? { projectRootMarkers: config.projectRootMarkers } : {},
  }
  codexInstructionListener(ctx, codexConfig, () => flags().codex)
  const systemPrompt = ctx.get('systemPrompt') as SystemPrompt | undefined
  if (systemPrompt !== undefined) {
    systemPrompt.section({
      name: 'context-injection:user-system-prompt',
      order: 100,
      text: () => flags().systemPrompt,
    })
  }
  // `/btw` side-question command (forked continuable child subagent).
  commandBtwApply(ctx, { maxQuestionBytes: config.maxQuestionBytes, provider: config.provider })

  // MCP authoring Remote: mount only when the Loader is present (global + agent-preset rows).
  if (ctx.get('loader') !== undefined) {
    await ctx.plugin(ClaudeCompatMcp)
  }
}



