/**
 * Filesystem access shared by this plugin's loaders.
 *
 * Every loader prefers the harness filesystem service (`ctx.fs`) so a session's
 * sandboxed view decides what is readable, and falls back to Node I/O when the
 * service is absent. The helpers here centralize that preference plus the
 * project-root walk, so the memory, rule, and skill loaders agree on which
 * directory is the project root and on what "the file is there" means.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/file-text
 */

import { homedir } from 'node:os'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'

/** Default directory entries that identify the project root. */
export const DEFAULT_PROJECT_ROOT_MARKERS = ['.git'] as const

/** What a path is, as far as this plugin cares. */
export type PathKind = 'file' | 'directory' | 'other'

/** Config fields shared by every loader that locates the project root. */
export interface ProjectRootConfig {
  /** Directory entries that identify the project root while walking upward. */
  projectRootMarkers?: string[]
}

/** Config fields shared by every loader that reads from the Claude home. */
export interface ClaudeHomeConfig {
  /** Claude Code config directory; defaults to `$CLAUDE_CONFIG_DIR`, then `$CLAUDE_HOME`, then `~/.claude`. */
  claudeHome?: string
}

/**
 * Resolve the Claude Code config directory.
 *
 * Claude Code itself reads `$CLAUDE_CONFIG_DIR`; `$CLAUDE_HOME` is the older
 * variable this plugin already honored, and `~/.claude` is the default.
 * @param config - composition configuration carrying an optional explicit home.
 * @returns the absolute Claude home path.
 */
export function resolveClaudeHome(config: ClaudeHomeConfig): string {
  return resolve(config.claudeHome ?? process.env.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_HOME ?? join(homedir(), '.claude'))
}

/**
 * Walk upward from a directory to the nearest ancestor holding a root marker.
 *
 * A marker counts whether it is a file (a worktree's `.git` file) or a
 * directory (a normal checkout's `.git`), so the walk uses `stat`.
 * @param cwd - the directory to start from.
 * @param markers - directory entry names that mark the project root.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @returns the project root, or the resolved `cwd` when no marker is found.
 */
export async function findProjectRoot(cwd: string, markers: readonly string[], ctx: Context): Promise<string> {
  let current = resolve(cwd)
  for (;;) {
    for (const marker of markers) {
      if (await pathKind(join(current, marker), ctx) !== undefined) return current
    }
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/**
 * What kind of entry a path is, or `undefined` when it does not exist.
 * @param path - absolute path to inspect.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @returns the entry kind, or `undefined` when unreadable or absent.
 */
export async function pathKind(path: string, ctx: Context): Promise<PathKind | undefined> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await pathKindFromFs(path, fs)
  try {
    const info = await stat(path)
    if (info.isDirectory()) return 'directory'
    return info.isFile() ? 'file' : 'other'
  } catch {
    return undefined
  }
}

/**
 * Whether a path exists at all, file or directory.
 * @param path - absolute path to inspect.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @returns `true` when the entry exists.
 */
export async function pathExists(path: string, ctx: Context): Promise<boolean> {
  return await pathKind(path, ctx) !== undefined
}

/**
 * Read a UTF-8 text file, treating every failure as absence.
 * @param path - absolute path to read.
 * @param ctx - plugin context (uses `ctx.fs` when present).
 * @returns the file's text, or `undefined` when it is missing, unreadable, or not a file.
 */
export async function readTextFile(path: string, ctx: Context): Promise<string | undefined> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await readTextFileFromFs(path, fs)
  try {
    return await readFile(path, { encoding: 'utf8' })
  } catch {
    return undefined
  }
}

/**
 * The `file_path` a `read` tool call named, when it named one.
 * @param exec - the recorded tool execution.
 * @returns the trimmed path argument, or `undefined` when the call carried none.
 */
export function readToolFilePath(exec: ToolExecution): string | undefined {
  if (typeof exec.arguments !== 'object' || exec.arguments === null) return undefined
  if (!('file_path' in exec.arguments) || typeof exec.arguments.file_path !== 'string') return undefined
  const path = exec.arguments.file_path.trim()
  return path.length > 0 ? path : undefined
}

/**
 * Convert a path to forward slashes for display and glob matching.
 * @param path - any platform's path text.
 * @returns the same path with backslashes replaced.
 */
export function pathToPosix(path: string): string {
  return path.split('\\').join('/')
}

async function pathKindFromFs(path: string, fs: FileSystem): Promise<PathKind | undefined> {
  try {
    const target = await fs.resolve(path)
    const info = await fs.stat(target)
    return info?.type
  } catch {
    return undefined
  }
}

async function readTextFileFromFs(path: string, fs: FileSystem): Promise<string | undefined> {
  try {
    const target = await fs.resolve(path)
    const info = await fs.stat(target)
    if (info === undefined || info.type !== 'file') return undefined
    return await fs.readText(target)
  } catch {
    return undefined
  }
}
