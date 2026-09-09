import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { SkillProviderControl } from '@deepseek-ai/dsh-skill'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { parseClaudeSkill } from '../src/parse.ts'
import { ClaudeCodeSkillProvider } from '../src/provider.ts'
import { loadClaudeInstructions, foldContext, injectIntoFirstRequest } from '../src/instructions.ts'
import { apply } from '../src/index.ts'

const SKILL_MD = `---
name: my-skill
description: A Claude skill for the test.
whenToUse: When doing test things.
---

Use this skill for test-related work.
`

async function tempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'dsh-claude-compat-'))
}

function mockCtx(): Context {
  return { get: () => undefined } as unknown as Context
}

function mockControl(): SkillProviderControl {
  return { signal: new AbortController().signal, invalidate: () => {} }
}

describe('parseClaudeSkill', () => {
  it('parses a valid Claude SKILL.md', () => {
    const parsed = parseClaudeSkill(SKILL_MD)
    expect(parsed).toBeDefined()
    expect(parsed?.name).toBe('my-skill')
    expect(parsed?.description).toBe('A Claude skill for the test.')
    expect(parsed?.whenToUse).toBe('When doing test things.')
    expect(parsed?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
    expect(parsed?.content).toContain('Use this skill')
  })

  it('rejects a file without a closing frontmatter fence', () => {
    expect(parseClaudeSkill('---\nname: x\ndescription: y\n')).toBeUndefined()
  })

  it('rejects a file missing the required description', () => {
    expect(parseClaudeSkill('---\nname: x\n---\nbody')).toBeUndefined()
  })

  it('honours the callable invocation keys', () => {
    const parsed = parseClaudeSkill(
      '---\nname: x\ndescription: y\ndisable-model-invocation: true\nuser-invocable: false\n---\nbody',
    )
    expect(parsed?.invocation).toEqual({ modelInvocable: false, userInvocable: false })
  })
})

describe('ClaudeCodeSkillProvider', () => {
  it('discovers project and global .claude/skills and loads bodies', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await mkdir(join(project, '.claude', 'skills', 'my-skill'), { recursive: true })
      await writeFile(join(project, '.claude', 'skills', 'my-skill', 'SKILL.md'), SKILL_MD)
      await mkdir(join(claudeHome, 'skills', 'global-skill'), { recursive: true })
      await writeFile(
        join(claudeHome, 'skills', 'global-skill', 'SKILL.md'),
        '---\nname: global-skill\ndescription: A global Claude skill.\n---\nGlobal body.',
      )
      // A malformed entry must be skipped, not surfaced.
      await mkdir(join(project, '.claude', 'skills', 'broken'), { recursive: true })
      await writeFile(join(project, '.claude', 'skills', 'broken', 'SKILL.md'), 'no frontmatter')

      // A .git marker makes the project root resolvable.
      await mkdir(join(project, '.git'), { recursive: true })

      const provider = new ClaudeCodeSkillProvider(mockCtx(), mockControl(), { claudeHome })
      const candidates = await provider.list({ cwd: project })
      const list = Array.isArray(candidates) ? candidates : []

      const names = list.map(c => c.name).sort()
      expect(names).toEqual(['global-skill', 'my-skill'])

      const local = list.find(c => c.name === 'my-skill')
      expect(local?.source).toBe('project-claude')
      const loaded = await provider.get(local!, { cwd: project })
      expect(loaded?.content).toContain('Use this skill')
      expect(loaded?.resourceBase).toEqual({ kind: 'directory', path: join(project, '.claude', 'skills', 'my-skill') })
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })
})

describe('loadClaudeInstructions', () => {
  it('combines global and project CLAUDE.md rules', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await mkdir(join(project, '.claude'), { recursive: true })
      await writeFile(join(project, '.claude', 'CLAUDE.md'), 'project rule')
      await writeFile(join(claudeHome, 'CLAUDE.md'), 'global rule')
      const ctx = mockCtx()
      const context = await loadClaudeInstructions(project, ctx, { claudeHome })
      expect(context).toBeDefined()
      expect(context?.text).toContain('project rule')
      expect(context?.text).toContain('global rule')
      expect(context?.files.map(f => f.displayPath)).toEqual(['.claude/CLAUDE.md', '~/.claude/CLAUDE.md'])
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })

  it('returns undefined when neither rule file exists', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      const context = await loadClaudeInstructions(project, mockCtx(), { claudeHome })
      expect(context).toBeUndefined()
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })

  it('honours includeGlobalRule: false', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await writeFile(join(claudeHome, 'CLAUDE.md'), 'global rule')
      const context = await loadClaudeInstructions(project, mockCtx(), { claudeHome, includeGlobalRule: false })
      expect(context).toBeUndefined()
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })
})

describe('foldContext', () => {
  it('inserts the injected message after the last user message', () => {
    const direct: UserMessage = createUserMessage({ content: [{ type: 'text', text: 'prompt' }], source: { kind: 'user' } })
    const folded = foldContext([direct], 'injected rule')
    expect(folded.length).toBe(2)
    expect(folded[0]).toBe(direct)
    const injected = folded[1]!
    expect(injected.content).toEqual([{ type: 'text', text: 'injected rule' }])
    expect(injected.source.kind).toBe('claude-code')
  })
})

describe('injectIntoFirstRequest', () => {
  it('returns a reject decision unchanged', () => {
    const decision: PreStepDecision = { kind: 'reject' }
    expect(injectIntoFirstRequest(decision, { text: 'x', files: [] })).toBe(decision)
  })

  it('does not inject into an empty enter', () => {
    const decision: PreStepDecision = { kind: 'enter', messages: [] }
    expect(injectIntoFirstRequest(decision, { text: 'x', files: [] })).toBe(decision)
  })
})

describe('user system-prompt section', () => {
  interface Section {
    name: string
    order: number
    text: string | (() => string)
  }

  /** A minimal plugin context: optional settings + system-prompt services. */
  function stubCtx(withSystemPrompt: boolean): { ctx: Context; sections: Section[] } {
    const sections: Section[] = []
    const settingsScope = {
      get: () => ({ claude: true, codex: true, systemPrompt: 'user guidance' }),
      watch: () => () => {},
    }
    const ctx = {
      skills: { registerProvider: () => () => {} },
      on: () => () => {},
      inject: (_deps: readonly string[], callback: (scope: { settings: unknown }) => void) => {
        callback({ settings: { register: () => settingsScope } })
      },
      get: (name: string) => name === 'systemPrompt'
        ? withSystemPrompt ? { section: (section: Section) => { sections.push(section) } } : undefined
        : undefined,
    } as unknown as Context
    return { ctx, sections }
  }

  it('registers the user system prompt as a live system-prompt section', () => {
    const { ctx, sections } = stubCtx(true)
    apply(ctx, {})

    expect(sections).toHaveLength(1)
    expect(sections[0]?.name).toBe('context-injection:user-system-prompt')
    expect(typeof sections[0]?.text).toBe('function')
    expect((sections[0]?.text as () => string)()).toBe('user guidance')
  })

  it('skips registration when the system-prompt service is absent', () => {
    const { ctx } = stubCtx(false)
    // No throw: the section is simply not registered.
    apply(ctx, {})
  })
})
