/**
 * Claude Code YAML frontmatter parsing shared by the skill and rule readers.
 *
 * Both `SKILL.md` and `.claude/rules/*.md` carry a leading `---`-fenced YAML
 * block. This module strips and parses that block into a data object plus the
 * remaining body, returning `undefined` when the file has no closing fence.
 *
 * @module @deepseek-ai/dsh-claude-compat/frontmatter
 */

import { parse as parseYaml } from 'yaml'

/** A parsed YAML frontmatter block and the body that follows it. */
export interface ParsedFrontmatter {
  data: Record<string, unknown>
  body: string
}

/**
 * Strip a leading YAML frontmatter block.
 * @param raw - the raw file text.
 * @returns the frontmatter data and the remaining body, or `undefined` when the
 *   file has no closing `---` fence after the required `---` opening line.
 */
export function parseYamlFrontmatter(raw: string): ParsedFrontmatter | undefined {
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return undefined
  const firstLine = raw.slice(0, firstLineEnd).replace(/\r$/, '')
  if (firstLine !== '---') return undefined
  const start = firstLineEnd + 1
  const closing = findClosingFrontmatter(raw, start)
  if (closing === undefined) return undefined
  const yaml = raw.slice(start, closing.start)
  const parsed = parseYaml(yaml) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  return { data: parsed as Record<string, unknown>, body: raw.slice(closing.bodyStart) }
}

function findClosingFrontmatter(raw: string, start: number): { start: number; bodyStart: number } | undefined {
  let lineStart = start
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    const line = raw.slice(lineStart, lineEnd).replace(/\r$/, '')
    if (line === '---') {
      return { start: lineStart, bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 }
    }
    if (nextNewline < 0) return undefined
    lineStart = nextNewline + 1
  }
  return undefined
}
