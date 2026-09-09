/**
 * Codex instruction contributor.
 *
 * Codex keeps its rules in `AGENTS.md`: a global one at `~/.codex/AGENTS.md`
 * and a project-level one at `<projectRoot>/.codex/AGENTS.md`. Like the Claude
 * contributor, this folds them into the first request as a `user` message under
 * its own message-source kind (`codex`) so the `agent-instructions` inbox
 * filters never manage these messages.
 *
 * @module @deepseek-ai/dsh-claude-compat/codex
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
// logged and replayed under their own `codex` kind.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'codex': { kind: 'codex' } & ContextFormed
  }
}

/** One discovered Codex rule file. */
export interface CodexInstructionFile {
  absolutePath: string
  displayPath: string
  content: string
}

/** Config for the Codex instruction contributor. */
export interface CodexInstructionConfig {
  /** Codex home; defaults to `$CODEX_HOME` or `~/.codex`. */
  codexHome?: string
  /** Directory entries that identify the project root while walking upward. */
  projectRootMarkers?: string[]
  /** Whether the project `.codex/AGENTS.md` is loaded. Defaults to true. */
  includeProjectRule?: boolean
  /** Whether the global `~/.codex/AGENTS.md` is loaded. Defaults to true. */
  includeGlobalRule?: boolean
}

/** Rendered Codex instruction context plus the files that produced it. */
export interface CodexInstructionContext {
  text: string
  files: CodexInstructionFile[]
}

/**
 * Discover and read the Codex rule files for a workspace.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, and which files to load.
 * @returns the combined context, or `undefined` when no rule file loaded.
 */
export async function loadCodexInstructions(
  cwd: string,
  ctx: Context,
  config: CodexInstructionConfig = {},
): Promise<CodexInstructionContext | undefined> {
  const codexHome = resolve(config.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), '.codex'))
  const markers = config.projectRootMarkers ?? ['.git']
  const files: CodexInstructionFile[] = []
  if (config.includeProjectRule !== false) {
    const projectRoot = await findProjectRoot(resolve(cwd), markers, ctx)
    const projectFile = await readRuleFile(join(projectRoot, '.codex', 'AGENTS.md'), ctx)
    if (projectFile !== undefined) {
      files.push({ absolutePath: projectFile.absolutePath, displayPath: '.codex/AGENTS.md', content: projectFile.content })
    }
  }
  if (config.includeGlobalRule !== false) {
    const globalFile = await readRuleFile(join(codexHome, 'AGENTS.md'), ctx)
    if (globalFile !== undefined) {
      files.push({ absolutePath: globalFile.absolutePath, displayPath: '~/.codex/AGENTS.md', content: globalFile.content })
    }
  }
  if (files.length === 0) return undefined
  const text = files.map(file => `Instructions from: ${file.displayPath}\n\n${file.content}`).join('\n\n')
  return { text, files }
}

/** Fold the Codex rule context into an entering step, mirroring `agent-instructions`. */
export function injectCodexIntoFirstRequest(decision: PreStepDecision, context: CodexInstructionContext): PreStepDecision {
  if (decision.kind === 'reject') return decision
  if (decision.messages.length === 0) return decision
  return { ...decision, messages: foldCodexContext(decision.messages, context.text) }
}

/** Insert the injected instructions after the last admitted user message. */
export function foldCodexContext(messages: UserMessage[], text: string): UserMessage[] {
  const content: ContentBlock[] = [{ type: 'text', text }]
  const source: MessageSource = { kind: 'codex', form: 'instructions' }
  const message = createUserMessage({ content, source })
  const lastIndex = messages.findLastIndex(m => m.role === 'user')
  if (lastIndex < 0) return [...messages, message]
  return messages.toSpliced(lastIndex + 1, 0, message)
}

/**
 * Register the `agent/pre-step` listener that reads and folds Codex rule
 * context, skipping entirely when `isEnabled()` is false.
 * @param ctx - plugin context.
 * @param config - home, root markers, and file selection.
 * @param isEnabled - thunk returning whether Codex injection is currently on.
 */
export function codexInstructionListener(
  ctx: Context,
  config: CodexInstructionConfig = {},
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
    // Inject at most once per session: an existing `codex` instructions user
    // message on the surfaced log means these rules were already folded in,
    // for this session or a resumed one, so do not repeat them.
    if (session.snapshotEvents().some(event =>
      event.type === 'user/message' && event.data.source.kind === 'codex')) return decision
    const cwd = session.header?.cwd
    if (cwd === undefined) return decision
    const context = await loadCodexInstructions(cwd, ctx, config)
    signal.throwIfAborted()
    if (context === undefined) return decision
    return injectCodexIntoFirstRequest(decision, context)
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
