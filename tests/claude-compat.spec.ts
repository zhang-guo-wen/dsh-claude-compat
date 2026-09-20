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
import { apply, inject } from '../src/index.ts'
import { registerContextInjection } from '../src/context-injection.ts'

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
  it('combines global and project CLAUDE.md rules broadest first', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      await mkdir(join(project, '.claude'), { recursive: true })
      await writeFile(join(project, '.claude', 'CLAUDE.md'), 'project rule')
      await writeFile(join(claudeHome, 'CLAUDE.md'), 'global rule')
      const ctx = mockCtx()
      const context = await loadClaudeInstructions(project, ctx, { claudeHome, includeManagedMemory: false })
      expect(context).toBeDefined()
      expect(context?.text).toContain('project rule')
      expect(context?.text).toContain('global rule')
      expect(context?.files.map(f => f.displayPath)).toEqual(['~/.claude/CLAUDE.md', '.claude/CLAUDE.md'])
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
    }
  })

  it('returns undefined when neither rule file exists', async () => {
    const project = await tempDir()
    const claudeHome = await tempDir()
    try {
      const context = await loadClaudeInstructions(project, mockCtx(), {
        claudeHome,
        includeManagedMemory: false,
        includeAutoMemory: false,
      })
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
      const context = await loadClaudeInstructions(project, mockCtx(), {
        claudeHome,
        includeGlobalRule: false,
        includeManagedMemory: false,
        includeAutoMemory: false,
      })
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
    expect(injected.source).toEqual({
      kind: 'plugin',
      plugin: '@zhang-guo-wen/dsh-claude-compat#claude-code',
      form: 'instructions',
    })
  })

  it('records the loader a nested memory file came from', () => {
    const direct: UserMessage = createUserMessage({ content: [{ type: 'text', text: 'prompt' }], source: { kind: 'user' } })
    const folded = foldContext([direct], 'nested memory', 'claude-memory')
    expect(folded[1]?.source).toEqual({
      kind: 'plugin',
      plugin: '@zhang-guo-wen/dsh-claude-compat#claude-memory',
      form: 'instructions',
    })
  })
})

describe('injectIntoFirstRequest', () => {
  type EnterDecision = Extract<PreStepDecision, { kind: 'enter' }>

  it('does not inject into an empty enter', () => {
    const decision: EnterDecision = { kind: 'enter', messages: [] }
    expect(injectIntoFirstRequest(decision, { text: 'x', files: [] })).toBe(decision)
  })

  it('injects into an enter carrying a claimed message', () => {
    const decision: EnterDecision = {
      kind: 'enter',
      messages: [createUserMessage({ content: [{ type: 'text', text: 'prompt' }], source: { kind: 'user' } })],
    }
    const amended = injectIntoFirstRequest(decision, { text: 'x', files: [] })
    expect(amended).not.toBe(decision)
    expect(amended.messages.map(message => message.content[0])).toEqual([
      { type: 'text', text: 'prompt' },
      { type: 'text', text: 'x' },
    ])
  })
})

describe('plugin composition', () => {
  /**
   * A minimal plugin context. `inject` stands in for the Cordis dependency
   * gate, handing back a scope carrying the settings service so the namespace
   * registration runs.
   */
  function stubCtx(): { ctx: Context; listeners: string[]; namespaces: string[]; providers: number } {
    const listeners: string[] = []
    const namespaces: string[] = []
    const scope = {
      get: () => ({ skills: true, rules: true, memory: true }),
      watch: () => () => {},
    }
    const state = { providers: 0 }
    const ctx = {
      skills: { registerProvider: () => { state.providers += 1; return () => {} } },
      on: (event: string) => { listeners.push(event); return () => {} },
      inject: (_deps: readonly string[], callback: (scope: { settings: unknown }) => void) => {
        callback({ settings: { register: (namespace: string) => { namespaces.push(namespace); return scope } } })
      },
      get: () => undefined,
    } as unknown as Context
    return {
      ctx,
      listeners,
      namespaces,
      get providers() { return state.providers },
    }
  }

  it('registers the skill provider, both contributors, and the settings namespace', async () => {
    const stub = stubCtx()
    await apply(stub.ctx, {})

    expect(stub.providers).toBe(1)
    // The memory contributor and the scoped-rule contributor each follow the
    // pre-step waterfall and each watch reads.
    expect(stub.listeners).toEqual(['agent/pre-step', 'tools/result', 'agent/pre-step', 'tools/result'])
    expect(stub.namespaces).toEqual(['context-injection'])
  })

  it('registers nothing beyond the skills service it declares', () => {
    // The retired Codex, system-prompt, and `/btw` contributions must not come
    // back as hidden injections.
    expect(inject).toEqual(['skills'])
  })
})

describe('registerContextInjection', () => {
  /** A context whose settings service resolves to `section` (or is absent). */
  function settingsCtx(section?: Record<string, boolean>): Context {
    return {
      inject: (_deps: readonly string[], callback: (scope: { settings: unknown }) => void) => {
        if (section === undefined) return
        callback({
          settings: {
            register: () => ({ get: () => section, watch: () => () => {} }),
          },
        })
      },
    } as unknown as Context
  }

  it('defaults all three switches on without a settings service', () => {
    const flags = registerContextInjection(settingsCtx(), {})
    expect(flags()).toEqual({ skills: true, rules: true, memory: true })
  })

  it('takes each switch from the composition when the user document is silent', () => {
    const flags = registerContextInjection(settingsCtx(), { skills: false, memory: false })
    expect(flags()).toEqual({ skills: false, rules: true, memory: false })
  })

  it('lets the user document override the composition per switch', () => {
    const flags = registerContextInjection(settingsCtx({ skills: true, rules: true, memory: false }), { skills: false })
    expect(flags()).toEqual({ skills: true, rules: true, memory: false })
  })
})
