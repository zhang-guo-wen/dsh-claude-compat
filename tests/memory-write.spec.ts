import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { registerClaudeMemoryWriteTool, writeClaudeMemory } from '../src/memory-write.ts'

const entry = { name: 'package-manager', title: 'Package manager', summary: 'Use pnpm for this repo', content: '# Package manager\nUse pnpm.\n' }

describe('Claude auto-memory writing', () => {
  it('creates a topic and indexes it without overwriting existing topics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'claude-write-'))
    try {
      const directory = join(root, 'memory')
      expect(await writeClaudeMemory(directory, entry)).toContain('Saved package-manager.md')
      expect(await readFile(join(directory, 'package-manager.md'), 'utf8')).toBe(entry.content)
      expect(await readFile(join(directory, 'MEMORY.md'), 'utf8')).toBe('- [Package manager](package-manager.md) — Use pnpm for this repo\n')
      await expect(writeClaudeMemory(directory, { ...entry, content: 'changed' })).rejects.toMatchObject({ code: 'EEXIST' })
      expect(await readFile(join(directory, 'package-manager.md'), 'utf8')).toBe(entry.content)
      expect((await readFile(join(directory, 'MEMORY.md'), 'utf8')).match(/package-manager\.md/g)).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects unsafe names and a full index before writing a topic', async () => {
    const root = await mkdtemp(join(tmpdir(), 'claude-write-'))
    try {
      await expect(writeClaudeMemory(root, { ...entry, name: '../escape' })).rejects.toThrow('Memory name')
      await writeFile(join(root, 'MEMORY.md'), 'x\n'.repeat(200))
      await expect(writeClaudeMemory(root, entry)).rejects.toThrow('loaded index limit')
      await expect(readFile(join(root, 'package-manager.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('registers and withdraws the tool when the write switch changes', async () => {
    let enabled = false
    let registered = 0
    let withdrawn = 0
    let changed: ((paths: readonly (readonly string[])[]) => void) | undefined
    const ctx = {
      tools: { register: () => { registered++; return () => { withdrawn++ } } },
      on: (_name: string, callback: typeof changed) => { changed = callback },
      effect: () => {},
    } as unknown as Context
    registerClaudeMemoryWriteTool(ctx, {}, () => enabled)
    expect(registered).toBe(0)
    enabled = true
    changed?.([['memoryWrite']])
    expect(registered).toBe(1)
    enabled = false
    changed?.([['memory']])
    expect(withdrawn).toBe(1)
  })

  it('writes to the Claude directory resolved for the session', async () => {
    const root = await mkdtemp(join(tmpdir(), 'claude-write-'))
    const project = join(root, 'project')
    let tool: ToolDefinition | undefined
    try {
      const ctx = {
        tools: { register: (definition: ToolDefinition) => { tool = definition; return () => {} } },
        on: () => {},
        effect: () => {},
        get: () => undefined,
      } as unknown as Context
      const directory = join(root, 'custom-memory')
      registerClaudeMemoryWriteTool(ctx, { autoMemoryDirectory: directory }, () => true)
      const result = await tool?.execute(entry, {
        signal: new AbortController().signal,
        agent: { session: { header: { cwd: project } } },
      } as never)
      expect(result).toEqual({ message: 'Saved package-manager.md and added its pointer to MEMORY.md.' })
      expect(await readFile(join(directory, 'package-manager.md'), 'utf8')).toBe(entry.content)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
