/**
 * Parse a Claude Code `SKILL.md` into the skill shape the harness registry reads.
 *
 * Claude Code skills use the same directory-bundle layout as the harness
 * (`<name>/SKILL.md`) and a YAML frontmatter carrying `name` and a
 * `description`, so the parser reuses the harness conventions: `name` must be
 * kebab-case, `description` is required, `whenToUse` is optional routing text,
 * and `metadata` is carried opaquely. The invocation keys match the harness
 * `skill-filesystem` grammar so a Claude skill honours the same model/user
 * surface controls.
 *
 * @module @deepseek-ai/dsh-claude-compat/parse
 */

import type { SkillInvocationPolicy } from '@deepseek-ai/dsh-skill'
import { isSkillName } from '@deepseek-ai/dsh-skill'
import { parseYamlFrontmatter } from './frontmatter.ts'

/** A parsed Claude Code skill file body. */
export interface ParsedClaudeSkill {
  name: string
  description: string
  whenToUse?: string
  invocation: SkillInvocationPolicy
  metadata?: Record<string, unknown>
  content: string
}

/**
 * Parse a Claude Code skill file into the registry shape.
 * @param raw - the raw file text.
 * @returns the parsed skill, or `undefined` when the file is not a valid skill.
 */
export function parseClaudeSkill(raw: string): ParsedClaudeSkill | undefined {
  const parsed = parseYamlFrontmatter(raw)
  if (parsed === undefined) return undefined
  const name = stringField(parsed.data, 'name')
  const description = stringField(parsed.data, 'description')
  if (name === undefined || description === undefined || !isSkillName(name)) return undefined
  const invocation = parseInvocation(parsed.data)
  return {
    name,
    description,
    ...optionalString(parsed.data, 'whenToUse'),
    invocation,
    ...optionalMetadata(parsed.data),
    content: parsed.body.trim(),
  }
}

function parseInvocation(data: Record<string, unknown>): SkillInvocationPolicy {
  const disableModelInvocation = frontmatterBoolean(data, 'disable-model-invocation')
  const userInvocable = frontmatterBoolean(data, 'user-invocable')
  return {
    modelInvocable: disableModelInvocation !== true,
    userInvocable: userInvocable !== false,
  }
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalString(data: Record<string, unknown>, key: string): { [K in typeof key]?: string } {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? { [key]: value } : {}
}

function optionalMetadata(data: Record<string, unknown>): { metadata?: Record<string, unknown> } {
  const value = data.metadata
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { metadata: value as Record<string, unknown> }
  }
  return {}
}

function frontmatterBoolean(data: Record<string, unknown>, key: string): boolean | undefined {
  if (!Object.hasOwn(data, key)) return undefined
  const value = data[key]
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
      case 'yes':
      case 'on':
        return true
      case 'false':
      case 'no':
      case 'off':
        return false
    }
  }
  return undefined
}
