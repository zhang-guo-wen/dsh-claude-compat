import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ContentBlock } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import {
  AUTO_MEMORY_INDEX_LINES,
  loadClaudeMemory,
  loadNestedMemory,
  projectSlug,
  resolveAutoMemoryDirectory,
  stripBlockHtmlComments,
} from '../src/memory.ts'
import {
  claudeInstructionListener,
  loadClaudeInstructions,
  stripHarnessClaudeMemory,
} from '../src/instructions.ts'

async function tempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'dsh-claude-memory-'))
}

function mockCtx(): Context {
  return { get: () => undefined } as unknown as Context
}

/** A memory batch with every machine-wide source disabled, so specs stay hermetic. */
const LOCAL_ONLY = { includeManagedMemory: false, includeAutoMemory: false } as const

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await tempDir()
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function writeMemoryFile(root: string, relativePath: string, content: string): Promise<void> {
  const path = join(root, relativePath)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content)
}

describe('loadClaudeMemory locations', () => {
  it('loads managed, user, and project memory broadest first', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const claudeHome = join(root, 'home')
      const managed = join(root, 'managed', 'CLAUDE.md')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'project memory')
      await writeMemoryFile(project, 'pkg/.claude/CLAUDE.md', 'package memory')
      await writeMemoryFile(claudeHome, 'CLAUDE.md', 'user memory')
      await writeMemoryFile(root, 'managed/CLAUDE.md', 'managed policy')

      const files = await loadClaudeMemory(join(project, 'pkg'), mockCtx(), {
        claudeHome,
        managedMemoryPath: managed,
        includeAutoMemory: false,
      })

      expect(files.map(file => file.displayPath)).toEqual([
        managed,
        '~/.claude/CLAUDE.md',
        '.claude/CLAUDE.md',
        'pkg/.claude/CLAUDE.md',
      ])
      expect(files.map(file => file.content)).toEqual([
        'managed policy',
        'user memory',
        'project memory',
        'package memory',
      ])
    })
  })

  it('reads the .claude/CLAUDE.md of every directory from the project root to cwd', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const claudeHome = join(root, 'home')
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, 'a', 'b'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'root body')
      await writeMemoryFile(project, 'a/.claude/CLAUDE.md', 'a body')
      await writeMemoryFile(project, 'a/b/.claude/CLAUDE.md', 'b body')

      const files = await loadClaudeMemory(join(project, 'a', 'b'), mockCtx(), { claudeHome, ...LOCAL_ONLY })

      expect(files.map(file => file.displayPath)).toEqual([
        '.claude/CLAUDE.md',
        'a/.claude/CLAUDE.md',
        'a/b/.claude/CLAUDE.md',
      ])
      expect(files.map(file => file.content)).toEqual(['root body', 'a body', 'b body'])
    })
  })

  it('honours each include switch', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const claudeHome = join(root, 'home')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'project memory')
      await writeMemoryFile(claudeHome, 'CLAUDE.md', 'user memory')

      const projectOnly = await loadClaudeMemory(project, mockCtx(), {
        claudeHome,
        ...LOCAL_ONLY,
        includeGlobalRule: false,
      })
      expect(projectOnly.map(file => file.content)).toEqual(['project memory'])

      const userOnly = await loadClaudeMemory(project, mockCtx(), {
        claudeHome,
        ...LOCAL_ONLY,
        includeProjectRule: false,
      })
      expect(userOnly.map(file => file.content)).toEqual(['user memory'])
    })
  })

  it('skips a memory file over the per-source byte cap', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'x'.repeat(64))
      await writeMemoryFile(project, 'CLAUDE.md', 'over the cap, certainly')

      const files = await loadClaudeMemory(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
        maxMemorySourceBytes: 16,
      })

      expect(files).toEqual([])
    })
  })

  it('renders the batch under one Instructions-from header per file', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'project memory')

      const context = await loadClaudeInstructions(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
      })

      expect(context?.text).toBe('Instructions from: .claude/CLAUDE.md\n\nproject memory')
    })
  })

  it('drops the files past the aggregate render budget', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const claudeHome = join(root, 'home')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(claudeHome, 'CLAUDE.md', 'user memory')
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'project memory')

      const context = await loadClaudeInstructions(project, mockCtx(), {
        claudeHome,
        ...LOCAL_ONLY,
        maxMemoryRenderBytes: 40,
      })

      // The first file is always rendered; the second exceeds the remaining budget.
      expect(context?.text).toBe('Instructions from: ~/.claude/CLAUDE.md\n\nuser memory')
    })
  })
})

describe('@path imports', () => {
  it('expands a relative import in place and resolves it against the importing file', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'See @notes/shared.md for details.')
      await writeMemoryFile(project, '.claude/notes/shared.md', 'shared body')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe('See shared body for details.')
    })
  })

  it('follows a chain up to the import depth and leaves the next hop literal', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', '@level1.md')
      await writeMemoryFile(project, '.claude/level1.md', '@level2.md')
      await writeMemoryFile(project, '.claude/level2.md', 'deepest')

      const shallow = await loadClaudeMemory(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
        maxImportDepth: 1,
      })
      expect(shallow[0]?.content).toBe('@level2.md')

      const deeper = await loadClaudeMemory(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
        maxImportDepth: 2,
      })
      expect(deeper[0]?.content).toBe('deepest')
    })
  })

  it('leaves a missing target, an email address, and a code span literal', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(
        project,
        '.claude/CLAUDE.md',
        ['@missing.md', 'mail me at dev@example.com', 'keep `@README` literal', 'now @README please'].join('\n'),
      )
      await writeMemoryFile(project, '.claude/README', 'readme body')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe([
        '@missing.md',
        'mail me at dev@example.com',
        'keep `@README` literal',
        'now readme body please',
      ].join('\n'))
    })
  })

  it('ignores an import inside a fenced code block', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', ['```', '@notes.md', '```', '', '@notes.md'].join('\n'))
      await writeMemoryFile(project, '.claude/notes.md', 'notes body')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe(['```', '@notes.md', '```', '', 'notes body'].join('\n'))
    })
  })

  it('expands a repeated import once per batch', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/shared.md', 'shared body')
      await writeMemoryFile(project, '.claude/CLAUDE.md', '@shared.md\n\n@shared.md')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe('shared body\n\n@shared.md')
    })
  })

  it('follows a circular import back to the file it started from', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', '@a.md')
      await writeMemoryFile(project, '.claude/a.md', '@b.md')
      await writeMemoryFile(project, '.claude/b.md', '@a.md')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe('@a.md')
    })
  })

  it('resolves `~` against the process user home, not the configured Claude home', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const claudeHome = join(root, 'home')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', '@~/.claude/preferences.md')
      await writeMemoryFile(claudeHome, 'preferences.md', 'prefer pnpm')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome, ...LOCAL_ONLY })

      expect(files[0]?.content).toBe('@~/.claude/preferences.md')
    })
  })
})

describe('stripBlockHtmlComments', () => {
  it('drops a whole-line comment and keeps an inline one', () => {
    const text = ['<!-- maintainer note -->', 'before <!-- kept --> after'].join('\n')
    expect(stripBlockHtmlComments(text)).toBe('before <!-- kept --> after')
  })

  it('drops a multi-line comment', () => {
    expect(stripBlockHtmlComments(['a', '<!--', 'note', '-->', 'b'].join('\n'))).toBe('a\nb')
  })

  it('keeps a comment inside a fenced code block and an unterminated comment', () => {
    const fenced = ['```', '<!-- example -->', '```'].join('\n')
    expect(stripBlockHtmlComments(fenced)).toBe(fenced)
    const unterminated = ['a', '<!-- open', 'b'].join('\n')
    expect(stripBlockHtmlComments(unterminated)).toBe(unterminated)
  })
})

describe('auto memory', () => {
  it('names a project directory the way Claude Code does', () => {
    expect(projectSlug('C:\\02-codespace\\deepseek-harness')).toBe('C--02-codespace-deepseek-harness')
    expect(projectSlug('/home/dev/my app')).toBe('-home-dev-my-app')
  })

  it('derives the directory from the repository, so a worktree shares it', async () => {
    await withTempDir(async (root) => {
      const repo = join(root, 'repo')
      const worktree = join(root, 'worktree')
      const claudeHome = join(root, 'home')
      await mkdir(join(repo, '.git', 'worktrees', 'wt'), { recursive: true })
      await mkdir(worktree, { recursive: true })
      await writeFile(join(worktree, '.git'), `gitdir: ${join(repo, '.git', 'worktrees', 'wt')}\n`)

      const fromRepo = await resolveAutoMemoryDirectory(repo, mockCtx(), { claudeHome })
      const fromWorktree = await resolveAutoMemoryDirectory(worktree, mockCtx(), { claudeHome })

      expect(fromRepo).toBe(join(claudeHome, 'projects', projectSlug(repo), 'memory'))
      expect(fromWorktree).toBe(fromRepo)
    })
  })

  it('lets a configured directory win and loads only the index', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const memoryDir = join(root, 'memory')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(memoryDir, 'MEMORY.md', '- [topic](topic.md)')
      await writeMemoryFile(memoryDir, 'topic.md', 'topic body')

      const files = await loadClaudeMemory(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        includeManagedMemory: false,
        includeProjectRule: false,
        includeGlobalRule: false,
        autoMemoryDirectory: memoryDir,
      })

      expect(files.map(file => file.displayPath)).toEqual([join(memoryDir, 'MEMORY.md')])
      expect(files[0]?.content).toBe('- [topic](topic.md)')
    })
  })

  it('caps the index at the lines and bytes Claude Code loads', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      const memoryDir = join(root, 'memory')
      await mkdir(join(project, '.git'), { recursive: true })
      const lines = Array.from({ length: AUTO_MEMORY_INDEX_LINES + 10 }, (_, index) => `line ${index}`)
      await writeMemoryFile(memoryDir, 'MEMORY.md', lines.join('\n'))

      const files = await loadClaudeMemory(project, mockCtx(), {
        claudeHome: join(root, 'home'),
        includeManagedMemory: false,
        includeProjectRule: false,
        includeGlobalRule: false,
        autoMemoryDirectory: memoryDir,
      })

      expect(files[0]?.content.split('\n')).toHaveLength(AUTO_MEMORY_INDEX_LINES)
    })
  })
})

describe('nested memory', () => {
  it('reads the memory files of every directory a read reached into', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, 'a', 'b'), { recursive: true })
      await writeFile(join(project, 'a', 'b', 'x.ts'), 'export {}\n')
      await writeMemoryFile(project, 'a/.claude/CLAUDE.md', 'a memory')
      await writeMemoryFile(project, 'a/b/.claude/CLAUDE.md', 'b memory')

      const config = { claudeHome: join(root, 'home'), ...LOCAL_ONLY }
      const files = await loadNestedMemory(project, ['a/b/x.ts'], mockCtx(), config)

      expect(files.map(file => file.displayPath)).toEqual(['a/.claude/CLAUDE.md', 'a/b/.claude/CLAUDE.md'])
      expect(files.map(file => file.content)).toEqual(['a memory', 'b memory'])
      expect(await loadNestedMemory(project, ['a/b/x.ts'], mockCtx(), { ...config, includeNestedMemory: false })).toEqual([])
      expect(await loadNestedMemory(project, ['x.ts'], mockCtx(), config)).toEqual([])
      expect(await loadNestedMemory(project, ['../outside.ts'], mockCtx(), config)).toEqual([])
    })
  })

  it('deduplicates directories across several read paths', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, 'a'), { recursive: true })
      await writeMemoryFile(project, 'a/.claude/CLAUDE.md', 'a memory')

      const files = await loadNestedMemory(project, ['a/one.ts', 'a/two.ts'], mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
      })

      expect(files).toHaveLength(1)
    })
  })
})

describe('CLAUDE.md takeover', () => {
  it('loads CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md in that order at every level', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, 'CLAUDE.md', 'root base')
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'root nested')
      await writeMemoryFile(project, 'CLAUDE.local.md', 'root local')
      await writeMemoryFile(project, 'pkg/CLAUDE.md', 'package base')
      await writeMemoryFile(project, 'pkg/CLAUDE.local.md', 'package local')

      const files = await loadClaudeMemory(join(project, 'pkg'), mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
      })

      expect(files.map(file => file.displayPath)).toEqual([
        'CLAUDE.md',
        '.claude/CLAUDE.md',
        'CLAUDE.local.md',
        'pkg/CLAUDE.md',
        'pkg/CLAUDE.local.md',
      ])
      expect(files.map(file => file.content)).toEqual([
        'root base',
        'root nested',
        'root local',
        'package base',
        'package local',
      ])
    })
  })

  it('expands an @import written in a project CLAUDE.md', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, 'CLAUDE.md', 'See @docs/notes.md for details.')
      await writeMemoryFile(project, 'docs/notes.md', 'imported project body')

      const files = await loadClaudeMemory(project, mockCtx(), { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(files[0]?.content).toBe('See imported project body for details.')
    })
  })

  it('reads a subdirectory CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md after a read reaches it', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, 'a', 'b'), { recursive: true })
      await writeFile(join(project, 'a', 'b', 'x.ts'), 'export {}\n')
      await writeMemoryFile(project, 'a/CLAUDE.md', 'a base')
      await writeMemoryFile(project, 'a/b/CLAUDE.local.md', 'b local')

      const files = await loadNestedMemory(project, ['a/b/x.ts'], mockCtx(), {
        claudeHome: join(root, 'home'),
        ...LOCAL_ONLY,
      })

      expect(files.map(file => file.displayPath)).toEqual(['a/CLAUDE.md', 'a/b/CLAUDE.local.md'])
      expect(files.map(file => file.content)).toEqual(['a base', 'b local'])
    })
  })
})

describe('workspace instruction takeover', () => {
  type UserMessage = ReturnType<typeof createUserMessage>

  const INTRO = 'The following workspace instructions may be relevant to your work.'

  function workspaceMessage(text: string): UserMessage {
    return createUserMessage({
      content: [{ type: 'text', text }],
      // The `agent-instructions` source kind is declared by the Harness loader
      // package, which this package does not depend on.
      source: { kind: 'agent-instructions', form: 'instructions' } as never,
    })
  }

  function texts(decision: PreStepDecision): string[] {
    if (decision.kind === 'reject') return []
    return decision.messages.flatMap(message => message.content)
      .filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text')
      .map(block => block.text)
  }

  it('removes the owned memory sections and keeps every other section', () => {
    const message = workspaceMessage([
      '<system-reminder>',
      INTRO,
      '',
      'Instructions from: AGENTS.md',
      '',
      'agents body',
      '',
      'Instructions from: pkg/CLAUDE.md',
      '',
      'project body',
      '',
      'Instructions removed: CLAUDE.local.md',
      '',
      'The previously loaded instructions from this file no longer apply.',
      '</system-reminder>',
    ].join('\n'))

    const text = texts(stripHarnessClaudeMemory({ kind: 'enter', messages: [message] })).join('\n')

    expect(text).toContain('agents body')
    expect(text).toContain(INTRO)
    expect(text).not.toContain('project body')
    expect(text).not.toContain('Instructions from: pkg/CLAUDE.md')
    expect(text).not.toContain('Instructions removed: CLAUDE.local.md')
  })

  it('drops a message left with nothing but its frame', () => {
    const message = workspaceMessage([
      '<system-reminder>',
      'Instructions from: CLAUDE.md',
      '',
      'only body',
      '</system-reminder>',
    ].join('\n'))

    expect(texts(stripHarnessClaudeMemory({ kind: 'enter', messages: [message] }))).toEqual([])
  })

  it('leaves a message with no owned section, and a non-workspace message, alone', () => {
    const untouched = workspaceMessage('<system-reminder>\nInstructions from: AGENTS.md\n\nagents body\n</system-reminder>')
    const decision: PreStepDecision = { kind: 'enter', messages: [untouched] }

    expect(stripHarnessClaudeMemory(decision)).toBe(decision)
  })
})

describe('claudeInstructionListener', () => {
  interface Harness {
    ctx: Context
    session: Session
    /** Messages the visible surface carries; a test clears it to simulate compaction. */
    committed: UserMessage[]
    step: (messages: UserMessage[], reject?: boolean) => Promise<PreStepDecision>
    read: (filePath: string) => void
  }

  type UserMessage = ReturnType<typeof createUserMessage>

  function harness(cwd: string, committed: UserMessage[] = []): Harness {
    const handlers = new Map<string, (...args: never[]) => unknown>()
    const ctx = {
      get: () => undefined,
      on: (name: string, handler: (...args: never[]) => unknown) => {
        handlers.set(name, handler)
        return () => handlers.delete(name)
      },
    } as unknown as Context
    const session = {
      header: { cwd },
      deriveMessages: () => [...committed],
    } as unknown as Session
    const agent = { session }
    return {
      ctx,
      session,
      committed,
      step: async (messages: UserMessage[], reject = false) => {
        const handler = handlers.get('agent/pre-step') as (
          payload: unknown,
          next: () => Promise<PreStepDecision>,
        ) => Promise<PreStepDecision>
        const decision = await handler(
          { agent, signal: new AbortController().signal },
          async () => reject ? { kind: 'reject' } : { kind: 'enter', messages },
        )
        // A proceeding step commits its injections to the visible surface.
        if (decision.kind !== 'reject') {
          for (const message of decision.messages) {
            if (!messages.includes(message)) committed.push(message)
          }
        }
        return decision
      },
      read: (filePath: string) => {
        const handler = handlers.get('tools/result') as (exec: unknown, result: unknown) => void
        handler({ name: 'read', agent, arguments: { file_path: filePath } }, { isError: false })
      },
    }
  }

  function prompt(): UserMessage {
    return createUserMessage({ content: [{ type: 'text', text: 'prompt' }], source: { kind: 'user' } })
  }

  function messageTexts(decision: PreStepDecision): string[] {
    if (decision.kind === 'reject') return []
    return decision.messages.flatMap(message => message.content)
      .filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text')
      .map(block => block.text)
  }

  it('folds the session-start batch once and a directory batch after a read', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, 'sub'), { recursive: true })
      await writeFile(join(project, 'sub', 'x.ts'), 'export {}\n')
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'baseline memory')
      await writeMemoryFile(project, 'sub/.claude/CLAUDE.md', 'nested memory')

      const test = harness(project)
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      const first = await test.step([prompt()])
      expect(messageTexts(first)).toEqual(['prompt', 'Instructions from: .claude/CLAUDE.md\n\nbaseline memory'])

      const second = await test.step([prompt()])
      expect(messageTexts(second)).toEqual(['prompt'])

      test.read('sub/x.ts')
      const third = await test.step([prompt()])
      expect(messageTexts(third)).toEqual(['prompt', 'Instructions from: sub/.claude/CLAUDE.md\n\nnested memory'])

      const fourth = await test.step([prompt()])
      expect(messageTexts(fourth)).toEqual(['prompt'])
    })
  })

  it('does not re-fold a batch a resumed session already carries', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'baseline memory')
      const resumed = createUserMessage({
        content: [{ type: 'text', text: 'Instructions from: .claude/CLAUDE.md\n\nbaseline memory' }],
        source: { kind: 'plugin', plugin: '@guowenzhang/dsh-claude-compat#claude-code', form: 'instructions' },
      })

      const test = harness(project, [resumed])
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(messageTexts(await test.step([prompt()]))).toEqual(['prompt'])
    })
  })

  it('folds the batch again after compaction removed it from the visible history', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'baseline memory')

      const test = harness(project)
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY })
      const folded = ['prompt', 'Instructions from: .claude/CLAUDE.md\n\nbaseline memory']

      expect(messageTexts(await test.step([prompt()]))).toEqual(folded)
      expect(messageTexts(await test.step([prompt()]))).toEqual(['prompt'])

      // Compaction shadows the memory message: it leaves the derived history
      // while the log it came from still holds it.
      test.committed.length = 0
      expect(messageTexts(await test.step([prompt()]))).toEqual(folded)
    })
  })

  it('strips the workspace loader CLAUDE.md section before the request is built', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, 'CLAUDE.md', 'owned body')
      const workspace = createUserMessage({
        content: [{
          type: 'text',
          text: [
            '<system-reminder>',
            'Instructions from: AGENTS.md',
            '',
            'agents body',
            '',
            'Instructions from: CLAUDE.md',
            '',
            'owned body',
            '</system-reminder>',
          ].join('\n'),
        }],
        source: { kind: 'agent-instructions', form: 'instructions' } as never,
      })

      const test = harness(project)
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY })
      const text = messageTexts(await test.step([workspace, prompt()])).join('\n')

      expect(text).toContain('agents body')
      expect(text.match(/owned body/g)).toHaveLength(1)
      expect(text).toContain('Instructions from: CLAUDE.md\n\nowned body')
    })
  })

  it('folds nothing into a rejected step', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'baseline memory')

      const test = harness(project)
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY })

      expect(await test.step([prompt()], true)).toEqual({ kind: 'reject' })
      expect(test.committed).toEqual([])
    })
  })

  it('folds nothing when Claude injection is disabled', async () => {
    await withTempDir(async (root) => {
      const project = join(root, 'project')
      await mkdir(join(project, '.git'), { recursive: true })
      await writeMemoryFile(project, '.claude/CLAUDE.md', 'baseline memory')

      const test = harness(project)
      claudeInstructionListener(test.ctx, { claudeHome: join(root, 'home'), ...LOCAL_ONLY }, () => false)

      expect(messageTexts(await test.step([prompt()]))).toEqual(['prompt'])
    })
  })
})
