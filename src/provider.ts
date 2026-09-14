/**
 * Claude Code skill provider: discovers `.claude/skills` from the project root
 * and the user's `~/.claude` home and serves them through `ctx.skills`.
 *
 * Claude Code stores skills as `<root>/.claude/skills/<name>/SKILL.md` (or a
 * flat `<name>.md`). This provider registers on the shared registry
 * (`dsh-skill`) exactly like `skill-filesystem`, but scans the Claude roots;
 * because it is one more provider, its candidates merge with every other skill
 * source and the registry's rank order decides duplicate names.
 *
 * @module @deepseek-ai/dsh-claude-compat/provider
 */

import { homedir } from 'node:os'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { FileSystem, FsDirEntry } from '@deepseek-ai/dsh-fs'
import type {
  SkillCandidate,
  SkillDefinition,
  SkillLookupOptions,
  SkillProvider,
  SkillProviderControl,
  SkillProviderObservation,
  SkillSource,
} from '@deepseek-ai/dsh-skill'
import { parseClaudeSkill } from './parse.ts'

/** Rank contributed by a project `.claude/skills` root, after project-agent roots. */
const PROJECT_CLAUDE_RANK = 250
/** Rank contributed by a user `~/.claude/skills` root, after user-agent roots. */
const USER_CLAUDE_RANK = 550

/** One scanned Claude skill root. */
interface SkillRoot {
  path: string
  source: SkillSource
  rank: number
}

/** A discovered skill candidate's provider-owned locator. */
interface LocalLocator {
  path: string
  directory: string
}

/** Config for the Claude Code skill provider. */
export interface Config {
  /** Unique provider name. Defaults to `claude-code`. */
  providerName?: string
  /** Claude Code home; defaults to `$CLAUDE_HOME` or `~/.claude`. */
  claudeHome?: string
  /** Directory entries that identify the project root while walking upward. */
  projectRootMarkers?: string[]
  /** Whether the project `.claude/skills` root is scanned. Defaults to true. */
  includeProjectRoot?: boolean
  /** Whether the user `~/.claude/skills` root is scanned. Defaults to true. */
  includeGlobalRoot?: boolean
  /** Live gate: when it returns false, no skill roots are scanned. Defaults to always-on. */
  enabled?: () => boolean
}

/** Local filesystem-backed provider for Claude Code skills. */
export class ClaudeCodeSkillProvider implements SkillProvider {
  readonly name: string
  private readonly claudeHome: string
  private readonly projectRootMarkers: string[]
  private readonly includeProjectRoot: boolean
  private readonly includeGlobalRoot: boolean
  private readonly enabled: () => boolean

  constructor(
    private readonly ctx: Context,
    readonly control: SkillProviderControl,
    config: Config = {},
  ) {
    this.name = config.providerName ?? 'claude-code'
    this.claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), '.claude'))
    this.projectRootMarkers = config.projectRootMarkers ?? ['.git']
    this.includeProjectRoot = config.includeProjectRoot ?? true
    this.includeGlobalRoot = config.includeGlobalRoot ?? true
    this.enabled = config.enabled ?? (() => true)
  }

  async list(options: SkillLookupOptions): Promise<readonly SkillCandidate[] | SkillProviderObservation> {
    if (!this.enabled()) return []
    const roots = await this.roots(options.cwd)
    const candidates: SkillCandidate[] = []
    for (const root of roots) {
      for (const skill of await this.discoverRoot(root)) {
        candidates.push(skill)
      }
    }
    return candidates
  }

  async get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
    const locator = candidate.locator as LocalLocator
    const raw = await this.readText(locator.path, options.signal)
    if (raw === undefined) return undefined
    const parsed = parseClaudeSkill(raw)
    if (parsed === undefined) return undefined
    return {
      name: parsed.name,
      description: parsed.description,
      ...parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {},
      invocation: parsed.invocation,
      source: candidate.source,
      provider: this.name,
      resourceBase: { kind: 'directory', path: locator.directory },
      path: locator.path,
      ...parsed.metadata !== undefined ? { metadata: parsed.metadata } : {},
      content: parsed.content,
    }
  }

  private async roots(cwd: string | undefined): Promise<SkillRoot[]> {
    const roots: SkillRoot[] = []
    if (this.includeProjectRoot && cwd !== undefined) {
      const projectRoot = await findProjectRoot(resolve(cwd), this.projectRootMarkers, this.ctx)
      roots.push({ path: join(projectRoot, '.claude', 'skills'), source: 'project-claude', rank: PROJECT_CLAUDE_RANK })
    }
    if (this.includeGlobalRoot) {
      roots.push({ path: join(this.claudeHome, 'skills'), source: 'user-claude', rank: USER_CLAUDE_RANK })
    }
    return roots
  }

  private async discoverRoot(root: SkillRoot): Promise<SkillCandidate[]> {
    const entries = await listSkillRootEntries(root.path, this.ctx)
    const skills: SkillCandidate[] = []
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const locator = entry.type === 'directory'
        ? { path: join(entry.path, 'SKILL.md'), directory: entry.path }
        : entry.type === 'file' && entry.name.endsWith('.md')
          ? { path: entry.path, directory: root.path }
          : undefined
      if (locator === undefined) continue
      const raw = await this.readText(locator.path, undefined)
      if (raw === undefined) continue
      const parsed = parseClaudeSkill(raw)
      if (parsed === undefined) continue
      skills.push({
        name: parsed.name,
        description: parsed.description,
        ...parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {},
        invocation: parsed.invocation,
        provider: this.name,
        source: root.source,
        rank: root.rank,
        locator,
        resourceBase: { kind: 'directory', path: locator.directory },
        path: locator.path,
        ...parsed.metadata !== undefined ? { metadata: parsed.metadata } : {},
      })
    }
    return skills
  }

  private async readText(path: string, signal: AbortSignal | undefined): Promise<string | undefined> {
    signal?.throwIfAborted()
    const fs = this.ctx.get('fs')
    if (fs !== undefined) {
      try {
        const target = await fs.resolve(path, signal === undefined ? undefined : { signal })
        signal?.throwIfAborted()
        const info = await fs.stat(target, signal)
        signal?.throwIfAborted()
        if (info === undefined || info.type !== 'file') return undefined
        return await fs.readText(target, signal)
      } catch {
        signal?.throwIfAborted()
        return undefined
      }
    }
    try {
      return await readFile(path, { encoding: 'utf8', signal })
    } catch {
      signal?.throwIfAborted()
      return undefined
    }
  }
}

async function listSkillRootEntries(root: string, ctx: Context): Promise<SkillRootEntry[]> {
  const fs = ctx.get('fs')
  if (fs !== undefined) return await listSkillRootEntriesFromFileSystem(root, fs)
  return await listSkillRootEntriesFromNode(root)
}

interface SkillRootEntry {
  name: string
  type: 'directory' | 'file' | 'other'
  path: string
}

async function listSkillRootEntriesFromFileSystem(root: string, fs: FileSystem): Promise<SkillRootEntry[]> {
  try {
    const target = await fs.resolve(root)
    const entries = await fs.listDir(target)
    return entries.map(entryFromFs)
  } catch {
    return []
  }
}

function entryFromFs(entry: FsDirEntry): SkillRootEntry {
  return { name: entry.name, type: entry.type, path: entry.target.displayPath }
}

async function listSkillRootEntriesFromNode(root: string): Promise<SkillRootEntry[]> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true, encoding: 'utf8' })
  } catch {
    return []
  }
  const result: SkillRootEntry[] = []
  for (const entry of entries) {
    let kind: 'directory' | 'file' | 'other' = 'other'
    try {
      if (entry.isDirectory()) kind = 'directory'
      else if (entry.isFile()) kind = 'file'
      else if (entry.isSymbolicLink()) {
        const info = await stat(join(root, entry.name))
        kind = info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'other'
      }
    } catch {
      kind = 'other'
    }
    result.push({ name: entry.name, type: kind, path: join(root, entry.name) })
  }
  return result
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
    await stat(path)
    return true
  } catch {
    return false
  }
}
