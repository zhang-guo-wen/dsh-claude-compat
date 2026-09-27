/**
 * Claude Code memory files.
 *
 * Claude Code remembers a project through files it loads at the start of every
 * session, in this order: a machine-wide managed policy file, the user file at
 * `~/.claude/CLAUDE.md`, and per-directory memory files from the project root
 * down to the working directory. Each directory on that chain contributes
 * `CLAUDE.md`, `.claude/CLAUDE.md`, and last its personal `CLAUDE.local.md`
 * overlay. It also keeps a self-written index at
 * `~/.claude/projects/<project>/memory/MEMORY.md`, whose topic files the model
 * reads on demand. Two preprocessing rules apply to a loaded file: `@path`
 * imports are expanded in place (relative to the importing file, at most four
 * hops, skipping code spans and fenced code blocks), and block-level HTML
 * comments are stripped.
 *
 * This module owns every one of those locations. The Harness's
 * `agent-instructions` loader reads the same-directory names under its own
 * rules — no `@path` expansion, a 1 MiB per-file cap, and per-directory content
 * deduplication — so `instructions.ts` strips the `CLAUDE.md` and
 * `CLAUDE.local.md` sections out of that loader's messages. Claude Code's file
 * set therefore reaches the model once, from here, under Claude Code's rules.
 * The auto-memory index is this module's alone: no other loader knows it.
 *
 * @module @guowenzhang/dsh-claude-compat/memory
 */

import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  DEFAULT_PROJECT_ROOT_MARKERS,
  findProjectRoot,
  pathKind,
  pathToPosix,
  readTextFile,
  resolveClaudeHome,
  type ClaudeHomeConfig,
  type ProjectRootConfig,
} from './file-text.ts'
import { byteLength, truncateToBytes } from './render.ts'

/** Per-file UTF-8 cap; Claude Code skips a `CLAUDE.md` larger than 4 MiB. */
export const DEFAULT_MAX_MEMORY_SOURCE_BYTES = 4_194_304
/** Aggregate UTF-8 cap for one folded memory batch. */
export const DEFAULT_MAX_MEMORY_RENDER_BYTES = 262_144
/** `@path` import hops Claude Code follows from one memory file. */
export const DEFAULT_MAX_IMPORT_DEPTH = 4
/** Filename of the auto-memory index inside a project's memory directory. */
export const AUTO_MEMORY_INDEX_NAME = 'MEMORY.md'
/** Lines of the auto-memory index Claude Code loads at session start. */
export const AUTO_MEMORY_INDEX_LINES = 200
/** Bytes of the auto-memory index Claude Code loads at session start. */
export const AUTO_MEMORY_INDEX_BYTES = 25_600
/** The project memory file name, at the directory and inside its `.claude` directory. */
const MEMORY_FILE_NAME = 'CLAUDE.md'
/** The personal project memory file name, loaded after the base file in its directory. */
const LOCAL_MEMORY_FILE_NAME = 'CLAUDE.local.md'

/** Config for every Claude Code memory-file decision this plugin makes. */
export interface MemoryConfig extends ClaudeHomeConfig, ProjectRootConfig {
  /** Whether the project `.claude/CLAUDE.md` chain is loaded. Defaults to true. */
  includeProjectRule?: boolean
  /** Whether the user `~/.claude/CLAUDE.md` is loaded. Defaults to true. */
  includeGlobalRule?: boolean
  /** Whether a directory's `.claude/CLAUDE.md` loads once the agent reads a file under it. Defaults to true. */
  includeNestedMemory?: boolean
  /** Whether the managed-policy memory file is loaded. Defaults to true. */
  includeManagedMemory?: boolean
  /** Managed-policy memory file; defaults to the platform's ClaudeCode policy path. */
  managedMemoryPath?: string
  /** Whether the auto-memory index (`MEMORY.md`) is loaded. Defaults to true. */
  includeAutoMemory?: boolean
  /**
   * Whether this plugin owns `CLAUDE.md` and `CLAUDE.local.md`: it reads them
   * itself, under Claude Code's rules, and the Harness `agent-instructions`
   * loader's sections for those two names are stripped from the request.
   * Defaults to true. A deployment that suspends those names in the loader's
   * own configuration sets this to false.
   */
  takeOverClaudeMd?: boolean
  /** Auto-memory directory; defaults to the ClaudeCode-derived project memory directory. */
  autoMemoryDirectory?: string
  /** Maximum UTF-8 bytes read from one memory file; larger files are ignored. */
  maxMemorySourceBytes?: number
  /** Maximum UTF-8 bytes rendered in one folded memory batch. */
  maxMemoryRenderBytes?: number
  /** Maximum `@path` import hops followed from one memory file. Defaults to 4. */
  maxImportDepth?: number
}

/** One memory file read for injection. */
export interface ClaudeMemoryFile {
  /** Absolute host path of the memory file. */
  absolutePath: string
  /** Model-facing path shown in the `Instructions from:` header. */
  displayPath: string
  /** The file's body after comment stripping and `@path` import expansion. */
  content: string
}

/** Files already read during one batch, so an import expands at most once. */
interface MemoryReadState {
  visited: Set<string>
}

/**
 * The managed-policy memory file for a platform.
 * @param platform - the Node platform name; defaults to the running one.
 * @returns the absolute policy path Claude Code reads on that platform.
 */
export function defaultManagedMemoryPath(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') return 'C:\\Program Files\\ClaudeCode\\CLAUDE.md'
  if (platform === 'darwin') return '/Library/Application Support/ClaudeCode/CLAUDE.md'
  return '/etc/claude-code/CLAUDE.md'
}

/**
 * Read the session-start memory batch for a working directory.
 *
 * Order runs broad to specific, matching Claude Code: managed policy, user,
 * the project chain from the project root down to `cwd` (each directory's
 * `CLAUDE.md`, `.claude/CLAUDE.md`, then `CLAUDE.local.md`), then the
 * auto-memory index. Missing and unreadable files are skipped, never fatal.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, file selection, and byte budgets.
 * @returns the memory files that exist, in load order.
 */
export async function loadClaudeMemory(
  cwd: string,
  ctx: Context,
  config: MemoryConfig = {},
): Promise<ClaudeMemoryFile[]> {
  const state: MemoryReadState = { visited: new Set() }
  const files: ClaudeMemoryFile[] = []
  if (config.includeManagedMemory !== false) {
    const path = config.managedMemoryPath ?? defaultManagedMemoryPath()
    await pushMemoryFile(files, path, path, ctx, config, state)
  }
  if (config.includeGlobalRule !== false) {
    const path = join(resolveClaudeHome(config), MEMORY_FILE_NAME)
    await pushMemoryFile(files, path, `~/.claude/${MEMORY_FILE_NAME}`, ctx, config, state)
  }
  if (config.includeProjectRule !== false) {
    const projectRoot = await findProjectRoot(cwd, config.projectRootMarkers ?? DEFAULT_PROJECT_ROOT_MARKERS, ctx)
    for (const directory of directoryChain(projectRoot, resolve(cwd))) {
      for (const candidate of claudeMemoryCandidates(directory, pathToPosix(relative(projectRoot, directory)))) {
        await pushMemoryFile(files, candidate.absolutePath, candidate.displayPath, ctx, config, state)
      }
    }
  }
  if (config.includeAutoMemory !== false) {
    const path = join(await resolveAutoMemoryDirectory(cwd, ctx, config), AUTO_MEMORY_INDEX_NAME)
    const raw = await readTextFile(path, ctx)
    // The index is Claude's own note file, not a `CLAUDE.md`: it loads as
    // written, bounded by the lines and bytes Claude Code reads.
    if (raw !== undefined) {
      files.push({ absolutePath: path, displayPath: path, content: capAutoMemoryIndex(raw) })
    }
  }
  return files
}

/**
 * Read the memory files of the directories a read reached into.
 *
 * Every directory between `cwd` and the read file contributes the same
 * candidate set the session-start chain uses.
 * @param cwd - absolute session working directory.
 * @param readPaths - `file_path` arguments of the `read` calls to resolve.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, file selection, and byte budgets.
 * @returns the nested memory files that exist, deduplicated by display path.
 */
export async function loadNestedMemory(
  cwd: string,
  readPaths: readonly string[],
  ctx: Context,
  config: MemoryConfig = {},
): Promise<ClaudeMemoryFile[]> {
  if (config.includeNestedMemory === false) return []
  const base = resolve(cwd)
  const state: MemoryReadState = { visited: new Set() }
  const files: ClaudeMemoryFile[] = []
  const seen = new Set<string>()
  for (const readPath of readPaths) {
    const absolute = isAbsolute(readPath) ? resolve(readPath) : resolve(base, readPath)
    const prefix = pathToPosix(relative(base, absolute))
    if (prefix.length === 0 || prefix === '..' || prefix.startsWith('../') || isAbsolute(prefix)) continue
    // `cwd` itself belongs to the session-start batch, not to a read trigger.
    for (const directory of directoryChain(base, dirname(absolute)).slice(1)) {
      for (const candidate of claudeMemoryCandidates(directory, pathToPosix(relative(base, directory)))) {
        if (seen.has(candidate.displayPath)) continue
        seen.add(candidate.displayPath)
        await pushMemoryFile(files, candidate.absolutePath, candidate.displayPath, ctx, config, state)
      }
    }
  }
  return files
}

/** One directory's memory file, located on disk and named for the model. */
export interface ClaudeMemoryCandidate {
  /** Absolute host path of the file. */
  absolutePath: string
  /** Model-facing path shown in the `Instructions from:` header. */
  displayPath: string
}

/**
 * The memory files one directory contributes, in Claude Code's load order.
 *
 * A directory's base file is `CLAUDE.md`, or `.claude/CLAUDE.md`; both load when
 * both exist. Its personal overlay `CLAUDE.local.md` loads after them, so
 * personal notes are the last thing read at that level.
 * @param directory - absolute directory to name candidates in.
 * @param prefix - the directory's model-facing path relative to the load base; empty at the base itself.
 * @returns that directory's candidates in load order.
 */
export function claudeMemoryCandidates(directory: string, prefix: string): ClaudeMemoryCandidate[] {
  const display = (name: string): string => prefix.length === 0 ? name : `${prefix}/${name}`
  return [
    { absolutePath: join(directory, MEMORY_FILE_NAME), displayPath: display(MEMORY_FILE_NAME) },
    { absolutePath: join(directory, '.claude', MEMORY_FILE_NAME), displayPath: display(`.claude/${MEMORY_FILE_NAME}`) },
    { absolutePath: join(directory, LOCAL_MEMORY_FILE_NAME), displayPath: display(LOCAL_MEMORY_FILE_NAME) },
  ]
}

/**
 * Resolve the directory Claude Code keeps a project's auto memory in.
 *
 * Claude Code derives the directory name from the git repository, so every
 * worktree and subdirectory of one repository shares a memory directory;
 * outside a repository the project root itself names it. A configured
 * `autoMemoryDirectory` wins over the derived path.
 * @param cwd - absolute session working directory.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - home, root markers, and the optional directory override.
 * @returns the absolute auto-memory directory (which need not exist).
 */
export async function resolveAutoMemoryDirectory(
  cwd: string,
  ctx: Context,
  config: MemoryConfig = {},
): Promise<string> {
  if (config.autoMemoryDirectory !== undefined) return resolve(config.autoMemoryDirectory)
  const projectRoot = await findProjectRoot(cwd, config.projectRootMarkers ?? DEFAULT_PROJECT_ROOT_MARKERS, ctx)
  const repository = await resolveRepositoryRoot(projectRoot, ctx)
  return join(resolveClaudeHome(config), 'projects', projectSlug(repository), 'memory')
}

/**
 * Claude Code's project-directory name for a path: every character outside
 * `[A-Za-z0-9]` becomes `-` (`C:\src\app` becomes `C--src-app`).
 * @param path - the absolute repository or project root path.
 * @returns the directory name Claude Code uses under `<claude home>/projects`.
 */
export function projectSlug(path: string): string {
  return path.replace(/[^A-Za-z0-9]/g, '-')
}

/**
 * Strip block-level HTML comments from a memory file.
 *
 * A comment that occupies whole lines is removed; one embedded in prose is
 * kept, and so is any comment inside a fenced code block. An unterminated
 * comment is left in place rather than swallowing the rest of the file.
 * @param text - the memory file body.
 * @returns the body without block-level HTML comments.
 */
export function stripBlockHtmlComments(text: string): string {
  return splitFencedRuns(text)
    .map(run => run.code ? run.text : run.text.replace(/^[ \t\r]*<!--[\s\S]*?-->[ \t\r]*\n?/gm, ''))
    .join('')
}

/**
 * Expand `@path` imports in place.
 *
 * A token is an import when its `@` starts a line or follows whitespace and the
 * resolved path names a readable file; anything else stays literal, which keeps
 * an `@mention` or an email address untouched. Relative paths resolve against
 * the importing file. Each file expands at most once per batch, so a repeated
 * or circular import stays literal instead of duplicating content.
 * @param text - the memory file body.
 * @param filePath - absolute path of the file the text came from.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @param config - byte budgets and the import depth.
 * @param state - the batch's already-expanded files.
 * @param depth - hops already followed from the batch's first file.
 * @returns the body with every resolvable import replaced by its content.
 */
export async function expandMemoryImports(
  text: string,
  filePath: string,
  ctx: Context,
  config: MemoryConfig,
  state: MemoryReadState,
  depth: number,
): Promise<string> {
  if (depth >= (config.maxImportDepth ?? DEFAULT_MAX_IMPORT_DEPTH)) return text
  const parts: string[] = []
  let cursor = 0
  for (const match of maskCodeRegions(text).matchAll(IMPORT_PATTERN)) {
    const token = match[1]!
    const tokenEnd = match.index + match[0].length
    const at = tokenEnd - token.length - 1
    const target = token.replace(TRAILING_PUNCTUATION, '')
    if (target.length === 0) continue
    const content = await readImportedFile(target, filePath, ctx, config, state, depth)
    if (content === undefined) continue
    parts.push(text.slice(cursor, at), content)
    cursor = at + 1 + target.length
  }
  if (cursor === 0) return text
  parts.push(text.slice(cursor))
  return parts.join('')
}

/** A candidate import: `@` at a line start or after whitespace. */
const IMPORT_PATTERN = /(?:^|\s)@([^\s`]+)/g
/** Punctuation a path token never ends with in prose. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"”’]+$/
/** A fenced code block's opening or closing run. */
const FENCE_PATTERN = /^[ \t\r]*(`{3,}|~{3,})/

async function pushMemoryFile(
  files: ClaudeMemoryFile[],
  path: string,
  displayPath: string,
  ctx: Context,
  config: MemoryConfig,
  state: MemoryReadState,
): Promise<void> {
  const maxSourceBytes = config.maxMemorySourceBytes ?? DEFAULT_MAX_MEMORY_SOURCE_BYTES
  const raw = await readTextFile(path, ctx)
  if (raw === undefined || byteLength(raw) > maxSourceBytes) return
  state.visited.add(resolve(path))
  files.push({
    absolutePath: path,
    displayPath,
    content: await expandMemoryImports(stripBlockHtmlComments(raw), path, ctx, config, state, 0),
  })
}

async function readImportedFile(
  token: string,
  filePath: string,
  ctx: Context,
  config: MemoryConfig,
  state: MemoryReadState,
  depth: number,
): Promise<string | undefined> {
  const path = resolveImportedPath(token, filePath)
  if (path === undefined || state.visited.has(path)) return undefined
  const raw = await readTextFile(path, ctx)
  if (raw === undefined || byteLength(raw) > (config.maxMemorySourceBytes ?? DEFAULT_MAX_MEMORY_SOURCE_BYTES)) return undefined
  state.visited.add(path)
  return await expandMemoryImports(stripBlockHtmlComments(raw), path, ctx, config, state, depth + 1)
}

function resolveImportedPath(token: string, filePath: string): string | undefined {
  if (token === '~') return resolve(homedir())
  if (token.startsWith('~/') || token.startsWith('~\\')) return resolve(homedir(), token.slice(2))
  const path = isAbsolute(token) ? resolve(token) : resolve(dirname(filePath), token)
  return path.length === 0 ? undefined : path
}

/** Keep an auto-memory index within the lines and bytes Claude Code loads. */
function capAutoMemoryIndex(text: string): string {
  const lines = text.split('\n')
  const capped = lines.length <= AUTO_MEMORY_INDEX_LINES ? text : lines.slice(0, AUTO_MEMORY_INDEX_LINES).join('\n')
  return truncateToBytes(capped, AUTO_MEMORY_INDEX_BYTES)
}

/** Directories from an ancestor down to a descendant, inclusive. */
function directoryChain(ancestor: string, descendant: string): string[] {
  const chain: string[] = []
  let current = resolve(descendant)
  const stop = resolve(ancestor)
  for (;;) {
    chain.push(current)
    if (current === stop) break
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return chain.reverse()
}

/**
 * The repository a project root belongs to.
 *
 * A `.git` directory means the project root is itself the repository. A `.git`
 * file names a git directory — `<repo>/.git/worktrees/<name>` for a linked
 * worktree — from which the main repository path is recovered so worktrees
 * share one auto-memory directory.
 */
async function resolveRepositoryRoot(projectRoot: string, ctx: Context): Promise<string> {
  const gitPath = join(projectRoot, '.git')
  if (await pathKind(gitPath, ctx) !== 'file') return projectRoot
  const text = await readTextFile(gitPath, ctx)
  const match = text === undefined ? null : /^gitdir:[ \t]*(.+?)[ \t\r]*$/m.exec(text)
  if (match === null) return projectRoot
  const worktree = /^(.*)[\\/]\.git[\\/]worktrees[\\/][^\\/]+$/.exec(resolve(projectRoot, match[1]!))
  return worktree === null ? projectRoot : worktree[1]!
}

/** One prose or fenced-code run of a document, in order. */
interface FencedRun {
  text: string
  code: boolean
}

/** Split a document into fenced-code and prose runs; the runs rejoin to the input. */
function splitFencedRuns(text: string): FencedRun[] {
  const lines = text.split('\n')
  const starts: number[] = []
  let offset = 0
  for (const line of lines) {
    starts.push(offset)
    offset += line.length + 1
  }
  const code = fencedLineFlags(lines)
  const runs: FencedRun[] = []
  let index = 0
  while (index < lines.length) {
    let end = index
    while (end + 1 < lines.length && code[end + 1] === code[index]) end += 1
    const from = starts[index]!
    const to = end + 1 < lines.length ? starts[end + 1]! : text.length
    runs.push({ text: text.slice(from, to), code: code[index]! })
    index = end + 1
  }
  return runs
}

/** Whether each line sits inside a fenced code block (or opens or closes one). */
function fencedLineFlags(lines: readonly string[]): boolean[] {
  const flags: boolean[] = []
  let fence: string | undefined
  for (const line of lines) {
    const match = FENCE_PATTERN.exec(line)
    if (fence !== undefined) {
      flags.push(true)
      if (match !== null && match[1]![0] === fence[0] && match[1]!.length >= fence.length) fence = undefined
      continue
    }
    if (match !== null) {
      fence = match[1]!
      flags.push(true)
      continue
    }
    flags.push(false)
  }
  return flags
}

/** Blank fenced code blocks and inline code spans so imports inside them do not match. */
function maskCodeRegions(text: string): string {
  return splitFencedRuns(text)
    .map(run => run.code ? ' '.repeat(run.text.length) : run.text.replace(/`[^`\n]*`/g, m => ' '.repeat(m.length)))
    .join('')
}
