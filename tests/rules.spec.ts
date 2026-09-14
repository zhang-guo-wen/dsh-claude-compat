import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ContentBlock, type GenerateOptions } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import * as ToolFs from '@deepseek-ai/dsh-tool-fs'
import { MockAdapter, textResponse, toolCallResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'
import * as ClaudeCompat from '../src/index.ts'
import { loadClaudeRules, parsePaths, renderRules, foldRulesContext, injectRulesIntoRequest, type ClaudeRule } from '../src/rules.ts'

async function tempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'dsh-claude-rules-'))
}

describe('parsePaths', () => {
  it('parses a single string glob', () => {
    expect(parsePaths('src/**/*.ts')).toEqual(['src/**/*.ts'])
  })

  it('parses a list of globs', () => {
    expect(parsePaths(['src/**/*.ts', 'test/**/*.ts'])).toEqual(['src/**/*.ts', 'test/**/*.ts'])
  })

  it('returns undefined for an empty or invalid paths value', () => {
    expect(parsePaths('')).toBeUndefined()
    expect(parsePaths([])).toBeUndefined()
    expect(parsePaths([''])).toBeUndefined()
    expect(parsePaths(undefined)).toBeUndefined()
    expect(parsePaths(42)).toBeUndefined()
  })
})

describe('loadClaudeRules', () => {
  it('discovers project and user rules, strips frontmatter, and walks subdirectories', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude', 'rules', 'nested'), { recursive: true })
      await mkdir(join(claudeHome, 'rules'), { recursive: true })
      await writeFile(join(project, '.claude', 'rules', 'always.md'), 'Always-on rule body.')
      await writeFile(
        join(project, '.claude', 'rules', 'api.md'),
        ['---', 'paths:', '  - "pkg/api/**/*.ts"', '---', '', 'API rule body.'].join('\n'),
      )
      await writeFile(join(project, '.claude', 'rules', 'nested', 'deep.md'), 'Nested rule body.')
      await writeFile(join(claudeHome, 'rules', 'global.md'), '---\npaths: [src/**]\n---\nGlobal scoped body.')

      const result = await loadClaudeRules(project, { get: () => undefined } as unknown as Context, { claudeHome })
      const byPath = new Map(result.rules.map(rule => [rule.displayPath, rule]))

      const always = byPath.get('.claude/rules/always.md')
      expect(always?.content).toBe('Always-on rule body.')
      expect(always?.paths).toBeUndefined()

      const api = byPath.get('.claude/rules/api.md')
      expect(api?.content).toBe('API rule body.')
      expect(api?.paths).toEqual(['pkg/api/**/*.ts'])

      const nested = byPath.get('.claude/rules/nested/deep.md')
      expect(nested?.content).toBe('Nested rule body.')

      const global = byPath.get('~/.claude/rules/global.md')
      expect(global?.content).toBe('Global scoped body.')
      expect(global?.paths).toEqual(['src/**'])

      expect(result.projectRoot).toBe(project)
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })

  it('honours includeProjectRules: false and project root markers', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await mkdir(join(project, '.claude', 'rules'), { recursive: true })
      await writeFile(join(project, '.claude', 'rules', 'always.md'), 'Always-on rule body.')
      const result = await loadClaudeRules(project, { get: () => undefined } as unknown as Context, {
        claudeHome,
        includeProjectRules: false,
        includeGlobalRules: false,
      })
      expect(result.rules).toEqual([])    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })
})

describe('renderRules and foldRulesContext', () => {
  const rule = (displayPath: string, content: string): ClaudeRule => ({ absolutePath: `/${displayPath}`, displayPath, content, paths: undefined })

  it('renders each rule under an Instructions-from header', () => {
    const text = renderRules([rule('.claude/rules/always.md', 'body')], 0)
    expect(text).toBe('Instructions from: .claude/rules/always.md\n\nbody')
  })

  it('honours the aggregate render budget', () => {
    const rules = [rule('.claude/rules/a.md', 'a'), rule('.claude/rules/b.md', 'b')]
    const single = renderRules(rules, 10)
    // Only the first rule fits under a 10-byte budget.
    expect(single).toBe('Instructions from: .claude/rules/a.md\n\na')
  })

  it('inserts the folded rules after the last user message', () => {
    const direct: UserMessage = createUserMessage({ content: [{ type: 'text', text: 'prompt' }], source: { kind: 'user' } })
    const folded = foldRulesContext([direct], 'injected rule')
    expect(folded.length).toBe(2)
    expect(folded[0]).toBe(direct)
    const injected = folded[1]!
    expect(injected.content).toEqual([{ type: 'text', text: 'injected rule' }])
    expect(injected.source.kind).toBe('claude-rule')
  })

  it('returns a reject decision unchanged from injectRulesIntoRequest', () => {
    const decision: PreStepDecision = { kind: 'reject' }
    expect(injectRulesIntoRequest(decision, 'x')).toBe(decision)
  })

  it('injects rules into an empty enter to support mid-turn scoped activation', () => {
    const decision: PreStepDecision = { kind: 'enter', messages: [] }
    const folded = injectRulesIntoRequest(decision, 'scoped rule')
    expect(folded.kind).toBe('enter')
    expect(folded.kind === 'enter' && folded.messages.length).toBe(1)
  })
})

describe('real agent-loop rules injection', () => {
  it('folds always-on rules once and activates a path-scoped rule on reading a matching file', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    let ctx: Context | undefined
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude', 'rules'), { recursive: true })
      await mkdir(join(project, 'pkg', 'api'), { recursive: true })
      await writeFile(join(project, '.claude', 'rules', 'always.md'), 'Alpha always-on rule body.')
      await writeFile(
        join(project, '.claude', 'rules', 'api.md'),
        ['---', 'paths:', '  - "pkg/api/**/*.ts"', '---', '', 'Beta API rule body.'].join('\n'),
      )
      await writeFile(join(project, 'pkg', 'api', 'users.ts'), 'export const users = []\n')
      await mkdir(join(claudeHome, 'rules'), { recursive: true })
      await writeFile(join(claudeHome, 'rules', 'never.md'), '---\npaths: [src/**]\n---\nNever-seen body.')

      const adapter = new MockAdapter([
        toolCallResponse('r1', 'read', { file_path: 'pkg/api/users.ts' }),
        textResponse('rules ok'),
      ])
      ctx = new Context()
      await mountAgentLoopTestDependencies(ctx)
      await ctx.plugin(LocalFileSystem, { cwd: '/' })
      await ctx.plugin(ToolFs)
      await ctx.plugin(SkillRegistry)
      await ctx.plugin(AgentLoop, { agents: [] })
      await ctx.plugin(ClaudeCompat, { claudeHome, projectRootMarkers: ['.git'], codex: false })
      ctx.llm.registerAdapter(['mock'], adapter)
      const agent = await ctx.agentLoop.create(SessionId('rules'), { provider: 'mock', model: 'mock' }, { cwd: project })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Inspect the users module.' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      expect(adapter.requests.length).toBe(2)

      // Request 1: only the always-on rule is present; the scoped rule is not yet active.
      const first = requestText(adapter.requests[0]!)
      expect(first).toContain('Alpha always-on rule body.')
      expect(first).not.toContain('Beta API rule body.')

      // Request 2: the scoped rule activated after the read tool touched a matching file.
      const second = requestText(adapter.requests[1]!)
      expect(second).toContain('Beta API rule body.')
      // A scoped rule whose glob never matched must not appear.
      expect(second).not.toContain('Never-seen body.')

      // The always-on rule must be folded exactly once on the session surface.
      const claudeRuleEvents = agent.session.snapshotEvents()
        .filter((event): event is Extract<ReturnType<typeof agent.session.snapshotEvents>[number], { type: 'user/message' }> =>
          event.type === 'user/message' && event.data.source.kind === 'claude-rule')
      const alwaysOn = claudeRuleEvents.filter(event => requestTextFromEvent(event).includes('Alpha always-on rule body.'))
      const scoped = claudeRuleEvents.filter(event => requestTextFromEvent(event).includes('Beta API rule body.'))
      expect(alwaysOn.length).toBe(1)
      expect(scoped.length).toBe(1)
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })

  it('resolves a relative read path against the session cwd, not the project root', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    let ctx: Context | undefined
    try {
      // The session cwd is a descendant of the project root, so a relative
      // `file_path` resolves against cwd first and must still match a
      // project-root-relative glob.
      const cwd = join(project, 'pkg')
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude', 'rules'), { recursive: true })
      await mkdir(join(cwd, 'api'), { recursive: true })
      await writeFile(
        join(project, '.claude', 'rules', 'api.md'),
        ['---', 'paths:', '  - "pkg/api/**/*.ts"', '---', '', 'Beta API rule body.'].join('\n'),
      )
      await writeFile(join(cwd, 'api', 'users.ts'), 'export const users = []\n')

      const adapter = new MockAdapter([
        toolCallResponse('r1', 'read', { file_path: 'api/users.ts' }),
        textResponse('rules ok'),
      ])
      ctx = new Context()
      await mountAgentLoopTestDependencies(ctx)
      await ctx.plugin(LocalFileSystem, { cwd: '/' })
      await ctx.plugin(ToolFs)
      await ctx.plugin(SkillRegistry)
      await ctx.plugin(AgentLoop, { agents: [] })
      await ctx.plugin(ClaudeCompat, { claudeHome, projectRootMarkers: ['.git'], codex: false })
      ctx.llm.registerAdapter(['mock'], adapter)
      const agent = await ctx.agentLoop.create(SessionId('rules-cwd'), { provider: 'mock', model: 'mock' }, { cwd })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Inspect the users module.' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      expect(adapter.requests.length).toBe(2)
      expect(requestText(adapter.requests[1]!)).toContain('Beta API rule body.')
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })
})

function requestText(request: GenerateOptions): string {
  return request.messages
    .flatMap(message => message.content)
    .filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}

function requestTextFromEvent(event: { data: { content: readonly ContentBlock[] } }): string {
  return event.data.content.filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text').map(block => block.text).join('\n')
}
