/**
 * Claude Code memory contributor.
 *
 * The session-start batch and its load order live in `memory.ts`; this module
 * decides when the batch reaches a request. The batch folds into the first
 * request that carries a user message, under the generic `plugin` message
 * source — the `agent-instructions` inbox filters match only their own kind, so
 * the two loaders never manage each other's messages.
 *
 * This module also owns `CLAUDE.md` and `CLAUDE.local.md` for the whole session.
 * The Harness's `agent-instructions` loader reads those same two names under
 * different rules — no `@path` expansion, a 1 MiB per-file cap, and
 * per-directory content deduplication — so every `agent-instructions` message
 * entering a step has its sections for the two owned names removed before the
 * request is built. The file set then reaches the model once, from `memory.ts`,
 * under Claude Code's rules.
 *
 * A directory's memory is read once the agent reads a file under it, which
 * happens mid-session; those files fold on the request that follows the read,
 * under their own loader name.
 *
 * What a session already carries is read from the model-visible surface, so a
 * memory message that compaction shadowed folds again from disk — the same
 * behavior Claude Code gives a project `CLAUDE.md` after `/compact`.
 *
 * @module @guowenzhang/dsh-claude-compat/instructions
 */

import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, Message, UserMessage } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import { readToolFilePath } from './file-text.ts'
import {
  DEFAULT_MAX_MEMORY_RENDER_BYTES,
  loadClaudeMemory,
  loadNestedMemory,
  type ClaudeMemoryFile,
  type MemoryConfig,
} from './memory.ts'
import { renderInstructionBlocks } from './render.ts'
import { instructionsSource, isInstructionsSource, type LoaderName } from './sources.ts'

/** The `read` tool name that triggers a directory's memory. */
const READ_TOOL_NAME = 'read'
/** Loader that produced the session-start memory batch. */
const BASELINE_LOADER: LoaderName = 'claude-code'
/** Loader that produced a directory's memory. */
const NESTED_LOADER: LoaderName = 'claude-memory'
/** The loaders whose already-folded content this module tracks. */
const TRACKED_LOADERS: readonly LoaderName[] = [BASELINE_LOADER, NESTED_LOADER]
/** The header each injected block carries, read back to see what a session already folded. */
const INSTRUCTIONS_HEADER = /^Instructions from: (.+?)[ \t\r]*$/gm
/**
 * Message source kind the Harness's own workspace-instruction loader records.
 * Typed as `string` because this package does not depend on the loader's type
 * declarations, so the merged source union here has no member for it.
 */
const HARNESS_INSTRUCTIONS_KIND: string = 'agent-instructions'
/** One file's section inside a Harness workspace-instructions message. */
const HARNESS_SECTION_HEADER = /^(?:Additional instructions from|Updated instructions from|Instructions from|Instructions removed): (.+?)[ \t\r]*$/gm
/** The memory file names this plugin owns, in any directory. */
const OWNED_MEMORY_NAMES: readonly string[] = ['CLAUDE.md', 'CLAUDE.local.md']

/** Config for the Claude Code memory contributor. */
export type InstructionConfig = MemoryConfig

/** Rendered Claude Code memory context plus the files that produced it. */
export interface ClaudeInstructionContext {
  text: string
  files: ClaudeMemoryFile[]
}

/**
 * Discover and read the Claude Code memory files for a workspace.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, file selection, and byte budgets.
 * @returns the combined context, or `undefined` when no memory file loaded.
 */
export async function loadClaudeInstructions(
  cwd: string,
  ctx: Context,
  config: InstructionConfig = {},
): Promise<ClaudeInstructionContext | undefined> {
  const files = await loadClaudeMemory(cwd, ctx, config)
  if (files.length === 0) return undefined
  return { text: renderInstructionBlocks(files, config.maxMemoryRenderBytes ?? DEFAULT_MAX_MEMORY_RENDER_BYTES), files }
}

/** The entering decision this contributor amends; a rejected proposal carries no messages. */
type EnterDecision = Extract<PreStepDecision, { kind: 'enter' }>

/**
 * Remove this plugin's memory files from the Harness loader's messages.
 *
 * A section is removed when its header names `CLAUDE.md` or `CLAUDE.local.md`
 * in any directory; every other section, the message's intro, and its budget
 * marker stay. A message left with an empty frame carries no content at all and
 * is dropped, which keeps the request free of an empty `<system-reminder>`.
 *
 * Removing the sections while keeping the message's source is what tells the
 * Harness loader the baseline is still present: it confirms a baseline by
 * message identity, so a rewritten message is not re-composed on the next step.
 * @param decision - the entering decision to amend.
 * @returns the decision with those sections removed, or the original when it carries none.
 */
export function stripHarnessClaudeMemory(decision: EnterDecision): EnterDecision {
  let changed = false
  const messages: UserMessage[] = []
  for (const message of decision.messages) {
    if (message.source.kind !== HARNESS_INSTRUCTIONS_KIND) {
      messages.push(message)
      continue
    }
    const content: ContentBlock[] = []
    let stripped = false
    for (const block of message.content) {
      if (block.type !== 'text') {
        content.push(block)
        continue
      }
      const body = stripOwnedSections(block.text)
      if (body === undefined) {
        stripped = true
        continue
      }
      if (body !== block.text) stripped = true
      content.push({ ...block, text: body })
    }
    if (!stripped) {
      messages.push(message)
      continue
    }
    changed = true
    if (content.length > 0) messages.push({ ...message, content })
  }
  return changed ? { ...decision, messages } : decision
}

/**
 * Fold the session-start memory into an entering step, mirroring `agent-instructions`.
 * @param decision - the pre-step decision to amend.
 * @param context - the rendered memory context to fold in.
 * @returns the amended decision.
 */
export function injectIntoFirstRequest(decision: EnterDecision, context: ClaudeInstructionContext): EnterDecision {
  return injectMemoryIntoRequest(decision, context.text, BASELINE_LOADER, true)
}

/**
 * Fold rendered memory text into an entering step.
 * @param decision - the pre-step decision to amend.
 * @param text - the rendered memory context to fold in.
 * @param loader - contributor that produced the text.
 * @param requireMessages - when true, a step carrying no newly claimed message is left alone.
 * @returns the amended decision.
 */
export function injectMemoryIntoRequest(
  decision: EnterDecision,
  text: string,
  loader: LoaderName,
  requireMessages: boolean,
): EnterDecision {
  if (requireMessages && decision.messages.length === 0) return decision
  return { ...decision, messages: foldContext(decision.messages, text, loader) }
}

/**
 * Insert the injected memory after the last admitted user message.
 * @param messages - the messages to amend.
 * @param text - the rendered memory context to insert.
 * @param loader - contributor to record on the folded message.
 * @returns the amended message array.
 */
export function foldContext(
  messages: UserMessage[],
  text: string,
  loader: LoaderName = BASELINE_LOADER,
): UserMessage[] {
  const content: ContentBlock[] = [{ type: 'text', text }]
  const message = createUserMessage({ content, source: instructionsSource(loader) })
  const lastIndex = messages.findLastIndex(m => m.role === 'user')
  if (lastIndex < 0) return [...messages, message]
  return messages.toSpliced(lastIndex + 1, 0, message)
}

/**
 * Register the Claude Code memory listeners: an `agent/pre-step` listener that
 * folds the session-start batch and each read directory's memory, plus a
 * `tools/result` listener that records which files were read.
 * @param ctx - plugin context.
 * @param config - home, root markers, file selection, and byte budgets.
 * @param isEnabled - thunk returning whether Claude memory injection is on.
 */
export function claudeInstructionListener(
  ctx: Context,
  config: InstructionConfig = {},
  isEnabled: () => boolean = () => true,
): void {
  const states = new WeakMap<Session, MemorySessionState>()

  ctx.on('agent/pre-step', async (
    { agent, signal },
    next: () => Promise<PreStepDecision>,
  ): Promise<PreStepDecision> => {
    const decision = await next()
    if (!isEnabled()) return decision
    if (decision.kind === 'reject') return decision
    const session = agent.session
    if (session === undefined) return decision
    let amended: EnterDecision = config.takeOverClaudeMd === false ? decision : stripHarnessClaudeMemory(decision)
    const folded = foldedInstructionPaths(session, amended.messages)
    if (!folded.has(BASELINE_LOADER)) {
      if (amended.messages.length === 0) return amended
      const cwd = session.header?.cwd
      if (cwd === undefined) return amended
      const context = await loadClaudeInstructions(cwd, ctx, config)
      signal.throwIfAborted()
      if (context !== undefined) amended = injectIntoFirstRequest(amended, context)
    }
    const state = ensureMemoryState(session, states)
    if (state.reads.size === 0) return amended
    const reads = [...state.reads]
    state.reads.clear()
    const cwd = session.header?.cwd
    if (cwd === undefined) return amended
    const alreadyFolded = folded.get(NESTED_LOADER) ?? new Set<string>()
    const files = (await loadNestedMemory(cwd, reads, ctx, config))
      .filter(file => !alreadyFolded.has(file.displayPath))
    signal.throwIfAborted()
    if (files.length === 0) return amended
    const text = renderInstructionBlocks(files, config.maxMemoryRenderBytes ?? DEFAULT_MAX_MEMORY_RENDER_BYTES)
    return injectMemoryIntoRequest(amended, text, NESTED_LOADER, false)
  })

  ctx.on('tools/result', (exec, result) => {
    if (!isEnabled() || result.isError || exec.name !== READ_TOOL_NAME || exec.agent === undefined) return
    const session = exec.agent.session
    if (session === undefined) return
    const filePath = readToolFilePath(exec)
    if (filePath !== undefined) ensureMemoryState(session, states).reads.add(filePath)
  })
}

interface MemorySessionState {
  /** `read` arguments whose directories have not been inspected yet. */
  reads: Set<string>
}

function ensureMemoryState(session: Session, states: WeakMap<Session, MemorySessionState>): MemorySessionState {
  let state = states.get(session)
  if (state === undefined) {
    state = { reads: new Set() }
    states.set(session, state)
  }
  return state
}

/**
 * The display paths each tracked loader already has on the model-visible
 * surface or in the entering batch, keyed by loader.
 *
 * Reading the surface rather than the complete event log is what makes a
 * compacted-away memory message fold again: a shadowed message is no longer in
 * the derived history, while the log it came from still is.
 * @param session - the session whose visible history is inspected.
 * @param messages - the entering batch, whose injections are not committed yet.
 * @returns a set of display paths per loader, present for every loader with a message.
 */
function foldedInstructionPaths(
  session: Session,
  messages: readonly UserMessage[],
): Map<LoaderName, Set<string>> {
  const found = new Map<LoaderName, Set<string>>()
  const visible: readonly Message[] = [...session.deriveMessages(), ...messages]
  for (const message of visible) {
    if (message.role !== 'user') continue
    for (const loader of TRACKED_LOADERS) {
      if (!isInstructionsSource(message.source, loader)) continue
      const paths = found.get(loader) ?? new Set<string>()
      for (const block of message.content) {
        if (block.type !== 'text') continue
        for (const match of block.text.matchAll(INSTRUCTIONS_HEADER)) paths.add(match[1]!)
      }
      found.set(loader, paths)
    }
  }
  return found
}

/** Remove the sections naming an owned memory file; `undefined` when no content would remain. */
function stripOwnedSections(text: string): string | undefined {
  const matches = [...text.matchAll(HARNESS_SECTION_HEADER)]
  if (!matches.some(match => isOwnedMemoryPath(match[1]!))) return text
  const kept: string[] = []
  let cursor = 0
  for (const [index, match] of matches.entries()) {
    if (!isOwnedMemoryPath(match[1]!)) continue
    const start = match.index ?? 0
    const next = matches[index + 1]
    kept.push(text.slice(cursor, start))
    cursor = next === undefined ? text.length : next.index ?? text.length
  }
  kept.push(text.slice(cursor))
  const stripped = kept.join('')
  return frameBody(stripped).trim().length > 0 ? stripped : undefined
}

/** Whether a section's model-facing path names a memory file this plugin owns. */
function isOwnedMemoryPath(displayPath: string): boolean {
  const name = displayPath.split(/[\\/]/).pop() ?? ''
  return OWNED_MEMORY_NAMES.includes(name)
}

/** The instructions message body, with its `<system-reminder>` frame markers removed. */
function frameBody(text: string): string {
  return text.replaceAll('<system-reminder>', '').replaceAll('</system-reminder>', '')
}
