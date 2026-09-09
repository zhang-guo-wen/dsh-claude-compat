/**
 * Claude Code scoped-rule contributor.
 *
 * Claude Code keeps scoped rules as markdown files under `.claude/rules/**`
 * (project) and `~/.claude/rules/**` (user). Each rule's YAML frontmatter may
 * carry a `paths:` list of gitignore-style globs; a rule **without** `paths`
 * loads unconditionally like `CLAUDE.md`, while a rule **with** `paths` loads
 * only when the agent reads a file matching one of those globs. This module
 * mirrors that behavior: it discovers the rule tree, parses `paths`, folds
 * always-on rules into the first request, and folds path-scoped rules in when a
 * matching file is read.
 *
 * The folded content reaches the model as one `user` message under its own
 * `claude-rule` message-source kind, so the `agent-instructions` inbox filters
 * (which match only `agent-instructions`) never manage these messages and the
 * contributor never re-injects a rule already on the surfaced log.
 *
 * @module @deepseek-ai/dsh-claude-compat/rules
 */

import { homedir } from 'node:os'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { FileSystem, FsDirEntry } from '@deepseek-ai/dsh-fs'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { ContentBlock, UserMessage, MessageSource, ContextFormed } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import picomatch from 'picomatch/posix'
import { parseYamlFrontmatter } from './frontmatter.ts'

// Merge-extensible message source: rules land on the session log and replay
// under their own `claude-rule` kind, so they are never managed by the
// `agent-instructions` inbox filters.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'claude-rule': { kind: 'claude-rule' } & ContextFormed
  }
}

/** The `read` tool name that drives path-scoped activation. */
const READ_TOOL_NAME = 'read'
/** Default per-file UTF-8 byte cap; larger rule files are skipped. */
const DEFAULT_RULE_SOURCE_BYTES = 1_048_576
/** Default aggregate UTF-8 byte cap for one injected rules batch. */
const DEFAULT_RULE_RENDER_BYTES = 262_144

/** One discovered Claude Code rule file. */
export interface ClaudeRule {
  /** Absolute host path of the rule file. */
  absolutePath: string
  /** Model-facing display path (`.claude/rules/foo.md` or `~/.claude/rules/foo.md`). */
  displayPath: string
  /** The rule body with any YAML frontmatter stripped. */
  content: string
  /**
   * Gitignore-style globs that scope this rule; `undefined` (or an empty
   * `paths`) makes the rule always-on, loading like `CLAUDE.md`.
   */
  paths: string[] | undefined
}

/** The discovered rule tree plus the project root used for path-relative matching. */
export interface ClaudeRulesResult {
  rules: ClaudeRule[]
  /** Project root that bounds discovery and anchors scoped glob matching. */
  projectRoot: string
}

/** Config for the Claude Code rule contributor. */
export interface RulesConfig {
  /** Claude Code home; defaults to `$CLAUDE_HOME` or `~/.claude`. */
  claudeHome?: string
  /** Directory entries that identify the project root while walking upward. */
  projectRootMarkers?: string[]
  /** Whether the project `.claude/rules` tree is scanned. Defaults to true. */
  includeProjectRules?: boolean
  /** Whether the user `~/.claude/rules` tree is scanned. Defaults to true. */
  includeGlobalRules?: boolean
  /** Maximum UTF-8 bytes read from one rule file; larger files are ignored. */
  maxRuleSourceBytes?: number
  /** Maximum UTF-8 bytes rendered in one injected rules batch. */
  maxRuleRenderBytes?: number
}

/**
 * Discover and read the Claude Code rule tree for a workspace.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, and file selection.
 * @returns the discovered rules and the project root they were anchored to.
 */
export async function loadClaudeRules(
  cwd: string,
  ctx: Context,
  config: RulesConfig = {},
): Promise<ClaudeRulesResult> {
  const claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), '.claude'))
  const markers = config.projectRootMarkers ?? ['.git']
  const maxSourceBytes = config.maxRuleSourceBytes ?? DEFAULT_RULE_SOURCE_BYTES
  const projectRoot = await findProjectRoot(resolve(cwd), markers, ctx)
  const rules: ClaudeRule[] = []
  if (config.includeProjectRules !== false) {
    const projectDir = join(projectRoot, '.claude', 'rules')
    for (const file of await walkRuleTree(projectDir, ctx)) {
      const rule = await readRuleFile(file, pathToPosix(relative(projectRoot, file)), maxSourceBytes, ctx)
      if (rule !== undefined) rules.push(rule)
    }
  }
  if (config.includeGlobalRules !== false) {
    const userDir = join(claudeHome, 'rules')
    for (const file of await walkRuleTree(userDir, ctx)) {
      const displayPath = `~/.claude/rules/${pathToPosix(relative(userDir, file))}`
      const rule = await readRuleFile(file, displayPath, maxSourceBytes, ctx)
      if (rule !== undefined) rules.push(rule)
    }
  }
  return { rules, projectRoot }
}

/**
 * Fold the given rule text into an entering step, mirroring `claude-instructions`.
 *
 * Unlike `claude-instructions`, a scoped rule may activate mid-turn after a
 * matching read, at which point the entering step may carry no newly claimed
 * messages. So an empty enter still receives the rules content; it is up to
 * {@link selectRulesToInject} to keep always-on rules out of such steps.
 *
 * @param decision - the pre-step decision to amend.
 * @param text - the rendered rule context to fold in.
 * @returns the amended decision, or the original when it cannot be amended.
 */
export function injectRulesIntoRequest(decision: PreStepDecision, text: string): PreStepDecision {
  if (decision.kind === 'reject') return decision
  return { ...decision, messages: foldRulesContext(decision.messages, text) }
}

/**
 * Insert the injected rules after the last admitted user message.
 * @param messages - the messages to amend.
 * @param text - the rendered rule context to insert.
 * @returns the amended message array.
 */
export function foldRulesContext(messages: UserMessage[], text: string): UserMessage[] {
  const content: ContentBlock[] = [{ type: 'text', text }]
  const source: MessageSource = { kind: 'claude-rule', form: 'instructions' }
  const message = createUserMessage({ content, source })
  const lastIndex = messages.findLastIndex(message => message.role === 'user')
  if (lastIndex < 0) return [...messages, message]
  return messages.toSpliced(lastIndex + 1, 0, message)
}

/**
 * Render the rules to fold, honoring the aggregate render budget.
 * @param rules - the rules to render, in model precedence order.
 * @param maxBytes - aggregate UTF-8 byte cap; a non-positive value disables the cap.
 * @returns the rendered text.
 */
export function renderRules(rules: readonly ClaudeRule[], maxBytes: number): string {
  const parts: string[] = []
  let bytes = 0
  for (const rule of rules) {
    const part = `Instructions from: ${rule.displayPath}\n\n${rule.content}`
    const separator = parts.length === 0 ? '' : '\n\n'
    const partBytes = byteLength(separator + part)
    // The first rule is always included (its source cap bounds it); later rules
    // are added only while the aggregate budget allows.
    if (parts.length > 0 && maxBytes > 0 && Number.isFinite(maxBytes) && bytes + partBytes > maxBytes) break
    parts.push(part)
    bytes += partBytes
  }
  return parts.join('\n\n')
}

/**
 * Register the rule contributor: an `agent/pre-step` listener that folds
 * always-on rules at the first request and path-scoped rules as they activate,
 * plus a `tools/result` listener that activates a path-scoped rule when a
 * matching file is read.
 *
 * @param ctx - plugin context.
 * @param config - home, root markers, file selection, and byte budgets.
 * @param isEnabled - thunk returning whether Claude rule injection is on.
 */
export function claudeRulesListener(
  ctx: Context,
  config: RulesConfig = {},
  isEnabled: () => boolean = () => true,
): void {
  const states = new WeakMap<Session, RuleSessionState>()

  ctx.on('agent/pre-step', async (
    { agent, signal },
    next: () => Promise<PreStepDecision>,
  ): Promise<PreStepDecision> => {
    const decision = await next()
    if (!isEnabled()) return decision
    if (decision.kind === 'reject') return decision
    const session = agent.session
    if (session === undefined) return decision
    const state = ensureState(session, states)
    if (state.loaded === undefined) {
      const cwd = session.header?.cwd
      if (cwd === undefined) return decision
      state.loaded = await loadClaudeRules(cwd, ctx, config)
      seedNeverReinject(session, state)
    }
    signal.throwIfAborted()
    const toInject = selectRulesToInject(session, state, decision.messages.length)
    if (toInject.length === 0) return decision
    const text = renderRules(toInject, config.maxRuleRenderBytes ?? DEFAULT_RULE_RENDER_BYTES)
    if (text.length === 0) return decision
    for (const rule of toInject) state.injected.add(rule.absolutePath)
    return injectRulesIntoRequest(decision, text)
  })

  ctx.on('tools/result', (exec: ToolExecution, result: ToolExecutionResult) => {
    if (isEnabled() && !result.isError && exec.name === READ_TOOL_NAME && exec.agent !== undefined) {
      const session = exec.agent.session
      if (session !== undefined) {
        const state = ensureState(session, states)
        if (state.loaded !== undefined) {
          const filePath = readFilePath(exec)
          const cwd = exec.agent.session.header.cwd
          if (filePath !== undefined && cwd !== undefined) activateMatchingRules(state, filePath, cwd)
        }
      }
    }
  })
}

interface RuleSessionState {
  loaded: ClaudeRulesResult | undefined
  injected: Set<string>
  activated: Set<string>
}

function ensureState(session: Session, states: WeakMap<Session, RuleSessionState>): RuleSessionState {
  let state = states.get(session)
  if (state === undefined) {
    state = { loaded: undefined, injected: new Set(), activated: new Set() }
    states.set(session, state)
  }
  return state
}

/**
 * Mark always-on rules as already injected when a `claude-rule` message already
 * sits on the surfaced log (a resumed or prior-turn session), so they are not
 * re-added while path-scoped rules may still activate in this session.
 */
function seedNeverReinject(session: Session, state: RuleSessionState): void {
  if (!hasClaudeRuleOnSurface(session)) return
  for (const rule of state.loaded?.rules ?? []) {
    if (rule.paths === undefined) state.injected.add(rule.absolutePath)
  }
}

function hasClaudeRuleOnSurface(session: Session): boolean {
  return session.snapshotEvents().some(event =>
    event.type === 'user/message' && event.data.source.kind === 'claude-rule')
}

function selectRulesToInject(session: Session, state: RuleSessionState, enteringMessageCount: number): ClaudeRule[] {
  const alreadyFolded = hasClaudeRuleOnSurface(session)
  const selected: ClaudeRule[] = []
  for (const rule of state.loaded?.rules ?? []) {
    if (state.injected.has(rule.absolutePath)) continue
    if (rule.paths === undefined) {
      // Always-on rules enter with the first user prompt; an empty entering
      // turn (a tool continuation or a session with no user message yet) must
      // not fold them on its own.
      if (alreadyFolded || enteringMessageCount === 0) continue
      selected.push(rule)
    } else if (state.activated.has(rule.absolutePath)) {
      // A path-scoped rule may activate mid-turn after a matching read, so it
      // is folded into the next request even when nothing was just claimed.
      selected.push(rule)
    }
  }
  return selected
}

function activateMatchingRules(state: RuleSessionState, filePath: string, cwd: string): void {
  const projectRoot = state.loaded?.projectRoot
  if (projectRoot === undefined) return
  // Resolve a relative path against the session cwd, exactly as the `read`
  // tool's fs backend does, then anchor the glob match to the project root.
  const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath)
  const projectRelative = pathToPosix(relative(projectRoot, absolute))
  if (projectRelative.length === 0 || projectRelative === '..' || projectRelative.startsWith('../') || isAbsolute(projectRelative)) return
  for (const rule of state.loaded?.rules ?? []) {
    if (rule.paths === undefined || state.injected.has(rule.absolutePath) || state.activated.has(rule.absolutePath)) continue
    for (const glob of rule.paths) {
      if (picomatch(pathToPosix(glob), { dot: true })(projectRelative)) {
        state.activated.add(rule.absolutePath)
        break
      }
    }
  }
}

function readFilePath(exec: ToolExecution): string | undefined {
  if (typeof exec.arguments !== 'object' || exec.arguments === null) return undefined
  if (!('file_path' in exec.arguments) || typeof exec.arguments.file_path !== 'string') return undefined
  const path = exec.arguments.file_path.trim()
  return path.length > 0 ? path : undefined
}

async function readRuleFile(
  path: string,
  displayPath: string,
  maxSourceBytes: number,
  ctx: Context,
): Promise<ClaudeRule | undefined> {
  const raw = await readRuleText(path, ctx)
  if (raw === undefined) return undefined
  if (byteLength(raw) > maxSourceBytes) return undefined
  const parsed = parseYamlFrontmatter(raw)
  const content = parsed === undefined ? raw : parsed.body.trim()
  const paths = parsed === undefined ? undefined : parsePaths(parsed.data.paths)
  return { absolutePath: path, displayPath, content, paths }
}

/**
 * Parse the `paths` frontmatter value into a non-empty glob list, or `undefined`.
 * @param value - the raw frontmatter `paths` value.
 * @returns the non-empty glob list, or `undefined` when the value is empty or invalid.
 */
export function parsePaths(value: unknown): string[] | undefined {
  if (typeof value === 'string') return value.length > 0 ? [value] : undefined
  if (Array.isArray(value)) {
    const globs = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    return globs.length > 0 ? globs : undefined
  }
  return undefined
}

async function readRuleText(path: string, ctx: Context): Promise<string | undefined> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await readRuleTextFromFs(path, fs)
  try {
    return await readFile(path, { encoding: 'utf8' })
  } catch {
    return undefined
  }
}

async function readRuleTextFromFs(path: string, fs: FileSystem): Promise<string | undefined> {
  try {
    const target = await fs.resolve(path)
    const info = await fs.stat(target)
    if (info === undefined || info.type !== 'file') return undefined
    return await fs.readText(target)
  } catch {
    return undefined
  }
}

async function walkRuleTree(root: string, ctx: Context): Promise<string[]> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await walkRuleTreeFromFs(root, fs)
  return await walkRuleTreeFromNode(root)
}

async function walkRuleTreeFromFs(root: string, fs: FileSystem): Promise<string[]> {
  const found: string[] = []
  await walkDirFromFs(root, fs, found)
  return found
}

async function walkDirFromFs(dir: string, fs: FileSystem, found: string[]): Promise<void> {
  let entries: FsDirEntry[]
  try {
    const target = await fs.resolve(dir)
    entries = await fs.listDir(target)
  } catch {
    return
  }
  for (const entry of entries) {
    const childPath = entry.target.displayPath
    if (entry.type === 'directory') {
      await walkDirFromFs(childPath, fs, found)
    } else if (entry.type === 'file' && entry.name.endsWith('.md')) {
      found.push(childPath)
    }
  }
}

async function walkRuleTreeFromNode(root: string): Promise<string[]> {
  const found: string[] = []
  await walkDirFromNode(root, found)
  return found
}

async function walkDirFromNode(dir: string, found: string[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' })
  } catch {
    return
  }
  for (const entry of entries) {
    const childPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkDirFromNode(childPath, found)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(childPath)
    }
  }
}

/** Walk upward to the first directory containing a configured root marker. */
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

function pathToPosix(path: string): string {
  return path.split('\\').join('/')
}

function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}
