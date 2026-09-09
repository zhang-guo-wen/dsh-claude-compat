/**
 * Claude Code instruction contributor.
 *
 * Claude Code keeps rules in `CLAUDE.md`: a project one at
 * `<projectRoot>/.claude/CLAUDE.md` and a user-global one at `~/.claude/CLAUDE.md`.
 * The harness's `agent-instructions` deliberately loads only same-directory
 * candidate names (`AGENTS.md`, `CLAUDE.md`), so this package contributes these
 * two Claude Code rule files as an additional instructions-form context, using
 * its own message-source kind so the two loaders never manage each other's
 * messages. It folds the content into the first request the same way
 * `agent-instructions` does, and is model-visible through a `user` message.
 *
 * @module @deepseek-ai/dsh-claude-compat/instructions
 */

import { homedir } from 'node:os'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, UserMessage, MessageSource, ContextFormed } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-llm'

// Merge-extensible message source: this contributor's injected instructions are
// logged and replayed under their own kind so `dsh-agent-instructions` inbox
// filters (which match `kind === 'agent-instructions'`) never touch them.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'claude-code': { kind: 'claude-code' } & ContextFormed
  }
}

/** One discovered Claude Code rule file. */
export interface ClaudeInstructionFile {
  absolutePath: string
  displayPath: string
  content: string
}

/** Config for the Claude Code instruction contributor. */
export interface InstructionConfig {
  /** Claude Code home; defaults to `$CLAUDE_HOME` or `~/.claude`. */
  claudeHome?: string
  /** Directory entries that identify the project root while walking upward. */
  projectRootMarkers?: string[]
  /** Whether the project `.claude/CLAUDE.md` is loaded. Defaults to true. */
  includeProjectRule?: boolean
  /** Whether the global `~/.claude/CLAUDE.md` is loaded. Defaults to true. */
  includeGlobalRule?: boolean
}

/** Rendered Claude Code instruction context plus the files that produced it. */
export interface ClaudeInstructionContext {
  text: string
  files: ClaudeInstructionFile[]
}

/**
 * Discover and read the Claude Code rule files for a workspace.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, and which files to load.
 * @returns the combined context, or `undefined` when no rule file loaded.
 */
export async function loadClaudeInstructions(
  cwd: string,
  ctx: Context,
  config: InstructionConfig = {},
): Promise<ClaudeInstructionContext | undefined> {
  const claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), '.claude'))
  const markers = config.projectRootMarkers ?? ['.git']
  const files: ClaudeInstructionFile[] = []
  if (config.includeProjectRule !== false) {
    const projectRoot = await findProjectRoot(resolve(cwd), markers, ctx)
    const projectFile = await readRuleFile(join(projectRoot, '.claude', 'CLAUDE.md'), ctx)
    if (projectFile !== undefined) {
      files.push({ absolutePath: projectFile.absolutePath, displayPath: '.claude/CLAUDE.md', content: projectFile.content })
    }
  }
  if (config.includeGlobalRule !== false) {
    const globalFile = await readRuleFile(join(claudeHome, 'CLAUDE.md'), ctx)
    if (globalFile !== undefined) {
      files.push({ absolutePath: globalFile.absolutePath, displayPath: '~/.claude/CLAUDE.md', content: globalFile.content })
    }
  }
  if (files.length === 0) return undefined
  const text = files.map(file => `Instructions from: ${file.displayPath}\n\n${file.content}`).join('\n\n')
  return { text, files }
}

/** Fold the Claude rule context into an entering step, mirroring `agent-instructions`. */
export function injectIntoFirstRequest(decision: PreStepDecision, context: ClaudeInstructionContext): PreStepDecision {
  if (decision.kind === 'reject') return decision
  if (decision.messages.length === 0) return decision
  return { ...decision, messages: foldContext(decision.messages, context.text) }
}

/** Insert the injected instructions after the last admitted user message. */
export function foldContext(messages: UserMessage[], text: string): UserMessage[] {
  const content: ContentBlock[] = [{ type: 'text', text }]
  const source: MessageSource = { kind: 'claude-code', form: 'instructions' }
  const message = createUserMessage({ content, source })
  const lastIndex = messages.findLastIndex(m => m.role === 'user')
  if (lastIndex < 0) return [...messages, message]
  return messages.toSpliced(lastIndex + 1, 0, message)
}

/**
 * Register the `agent/pre-step` listener that reads and folds Claude rule
 * context, skipping entirely when `isEnabled()` is false.
 * @param ctx - plugin context.
 * @param config - home, root markers, and file selection.
 * @param isEnabled - thunk returning whether Claude injection is currently on.
 */
export function claudeInstructionListener(
  ctx: Context,
  config: InstructionConfig = {},
  isEnabled: () => boolean = () => true,
): void {
  ctx.on('agent/pre-step', async (
    { agent, signal },
    next: () => Promise<PreStepDecision>,
  ): Promise<PreStepDecision> => {
    const decision = await next()
    if (!isEnabled()) return decision
    if (decision.kind === 'reject') return decision
    if (decision.messages.length === 0) return decision
    const session = agent.session
    if (session === undefined) return decision
    // Inject at most once per session: an existing `claude-code` instructions
    // user message on the surfaced log means these rules were already folded
    // in, for this session or a resumed one, so do not repeat them.
    if (session.snapshotEvents().some(event =>
      event.type === 'user/message' && event.data.source.kind === 'claude-code')) return decision
    const cwd = session.header?.cwd
    if (cwd === undefined) return decision
    const context = await loadClaudeInstructions(cwd, ctx, config)
    signal.throwIfAborted()
    if (context === undefined) return decision
    return injectIntoFirstRequest(decision, context)
  })
}

interface ReadRuleResult {
  absolutePath: string
  content: string
}

async function readRuleFile(path: string, ctx: Context): Promise<ReadRuleResult | undefined> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await readRuleFileFromFs(path, fs)
  try {
    const content = await readFile(path, { encoding: 'utf8' })
    return { absolutePath: path, content }
  } catch {
    return undefined
  }
}

async function readRuleFileFromFs(path: string, fs: FileSystem): Promise<ReadRuleResult | undefined> {
  try {
    const target = await fs.resolve(path)
    const info = await fs.stat(target)
    if (info === undefined || info.type !== 'file') return undefined
    const content = await fs.readText(target)
    return { absolutePath: path, content }
  } catch {
    return undefined
  }
}

async function findProjectRoot(cwd: string, markers: string[], ctx: Context): Promise<string> {
  const fs = ctx.get('fs')
  let current = resolve(cwd)
  for (;;) {
    for (const marker of markers) {
      if (await pathExists(join(current, marker), fs)) return current
    }
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

async function pathExists(path: string, fs: FileSystem | undefined): Promise<boolean> {
  if (fs !== undefined) {
    try {
      const target = await fs.resolve(path)
      return await fs.stat(target) !== undefined
    } catch {
      return false
    }
  }
  try {
    await readFile(path, { encoding: 'utf8' })
    return true
  } catch {
    return false
  }
}
