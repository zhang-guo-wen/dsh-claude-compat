import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as ClaudeCompat from '../src/index.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

async function loadYaml(lines: readonly string[]): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-claude-compat-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [...lines, ''].join('\n'))

  context = new Context()
  context.baseUrl = pathToFileURL(root).href + '/'
  await context.plugin(Loader)
  context.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-skill', SkillRegistry],
    ['@deepseek-ai/dsh-claude-compat', ClaudeCompat],
  ])
  context.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof context.loader.internal>
  await context.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await context.loader.await()
  return context
}

describe('real Loader composition', () => {
  it('discovers a project .claude/skills through ctx.skills', async () => {
    const project = await mkdtemp(join(tmpdir(), 'dsh-claude-proj-'))
    const claudeHome = await mkdtemp(join(tmpdir(), 'dsh-claude-home-'))
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude', 'skills', 'my-skill'), { recursive: true })
      await writeFile(
        join(project, '.claude', 'skills', 'my-skill', 'SKILL.md'),
        ['---', 'name: my-skill', 'description: A composed skill.', '---', '', 'Body.'].join('\n'),
      )

      const loaded = await loadYaml([
        "- name: '@deepseek-ai/dsh-skill'",
        "- name: '@deepseek-ai/dsh-claude-compat'",
        '  config:',
        '    claudeHome: ' + JSON.stringify(claudeHome),
      ])

      const unloaded = [...loaded.loader.entries()]
        .filter(entry => entry.fiber === undefined && !entry.disabled)
        .map(entry => entry.options.name)
      expect(unloaded).toEqual([])

      const snapshot = await loaded.skills.snapshot({ cwd: project })
      const names = snapshot.skills.map(skill => skill.name)
      expect(names).toContain('my-skill')

      const skill = await loaded.skills.get('my-skill', { cwd: project })
      expect(skill?.content).toContain('Body.')
      expect(skill?.source).toBe('project-claude')
    } finally {
      await rm(project, { recursive: true, force: true })
    }
  })
})
