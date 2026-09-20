import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage, LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import * as AgentInstructions from '@deepseek-ai/dsh-agent-instructions'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import * as ToolFs from '@deepseek-ai/dsh-tool-fs'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as ClaudeCompat from '../src/index.ts'
import { projectSlug } from '../src/memory.ts'
import { isInstructionsSource } from '../src/sources.ts'

class ScriptedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  constructor(private readonly script: StreamChunk[][]) {
    super()
  }
  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const chunks = this.script.shift()
    if (chunks === undefined) throw new Error('ScriptedAdapter: script exhausted')
    for (const chunk of chunks) yield chunk
  }
}

function textResponse(text: string): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

function requestText(request: GenerateOptions): string {
  return request.messages
    .flatMap(message => message.content)
    .filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}

async function loopHarness(adapter: ScriptedAdapter, claudeHome: string): Promise<Context> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(ClaudeCompat, { claudeHome, projectRootMarkers: ['.git'], includeManagedMemory: false })
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

/**
 * The deployed registration order: this plugin is a host row registered at
 * boot, while the Harness workspace-instruction loader registers from the agent
 * preset, which mounts lazily on the first agent. The earlier listener is
 * outermost in the waterfall, so this one sees the loader's baseline.
 */
async function takeoverHarness(adapter: ScriptedAdapter, claudeHome: string): Promise<Context> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  // The Harness loader reads through the filesystem service, so this
  // composition needs one.
  await ctx.plugin(LocalFileSystem, { cwd: '/' })
  await ctx.plugin(ToolFs)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(ClaudeCompat, { claudeHome, projectRootMarkers: ['.git'], includeManagedMemory: false })
  await ctx.plugin(AgentInstructions, { maxBytes: 65536 })
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

describe('real agent-loop Claude memory injection', () => {
  it('folds the Claude memory files into the first request once, not the second', async () => {
    const project = await mkdtemp(join(tmpdir(), 'dsh-claude-rules-'))
    const claudeHome = await mkdtemp(join(tmpdir(), 'dsh-claude-home-'))
    let ctx: Context | undefined
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude'), { recursive: true })
      await writeFile(join(project, '.claude', 'CLAUDE.md'), 'project rule')
      await writeFile(join(claudeHome, 'CLAUDE.md'), 'global rule')

      const adapter = new ScriptedAdapter([textResponse('ok'), textResponse('ok')])
      ctx = await loopHarness(adapter, claudeHome)
      const agent = await ctx.agentLoop.create(SessionId('rules'), { provider: 'mock', model: 'mock' }, { cwd: project })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } }))
      await agent.whenIdle()
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'again' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      expect(adapter.requests.length).toBe(2)
      const first = requestText(adapter.requests[0]!)
      expect(first).toContain('Instructions from: .claude/CLAUDE.md')
      expect(first).toContain('Instructions from: ~/.claude/CLAUDE.md')
      expect(first).toContain('project rule')
      expect(first).toContain('global rule')

      // The memory is injected exactly once: only one `claude-code` user message
      // lands on the session surface, so later turns carry it in history but never
      // add a second copy.
      const memoryMessages = agent.session.snapshotEvents()
        .filter((event): event is Extract<ReturnType<typeof agent.session.snapshotEvents>[number], { type: 'user/message' }> =>
          event.type === 'user/message' && isInstructionsSource(event.data.source, 'claude-code'))
      expect(memoryMessages.length).toBe(1)
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })

  it('expands @imports and folds the auto-memory index into the first request', async () => {
    const project = await mkdtemp(join(tmpdir(), 'dsh-claude-memory-'))
    const claudeHome = await mkdtemp(join(tmpdir(), 'dsh-claude-home-'))
    let ctx: Context | undefined
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await mkdir(join(project, '.claude'), { recursive: true })
      await writeFile(join(project, '.claude', 'CLAUDE.md'), 'project rule\n\nDetails: @notes.md')
      await writeFile(join(project, '.claude', 'notes.md'), 'imported body')
      const memoryDir = join(claudeHome, 'projects', projectSlug(project), 'memory')
      await mkdir(memoryDir, { recursive: true })
      await writeFile(join(memoryDir, 'MEMORY.md'), '- [preference](preference.md) — prefer pnpm')

      const adapter = new ScriptedAdapter([textResponse('ok')])
      ctx = await loopHarness(adapter, claudeHome)
      const agent = await ctx.agentLoop.create(SessionId('memory'), { provider: 'mock', model: 'mock' }, { cwd: project })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      const first = requestText(adapter.requests[0]!)
      expect(first).toContain('imported body')
      expect(first).not.toContain('@notes.md')
      expect(first).toContain('Instructions from: ' + join(memoryDir, 'MEMORY.md'))
      expect(first).toContain('- [preference](preference.md) — prefer pnpm')
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })
})

describe('real agent-loop CLAUDE.md takeover', () => {
  it('loads CLAUDE.md here, with @imports expanded, and strips it from the workspace loader', async () => {
    const project = await mkdtemp(join(tmpdir(), 'dsh-claude-takeover-'))
    const claudeHome = await mkdtemp(join(tmpdir(), 'dsh-claude-home-'))
    let ctx: Context | undefined
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await writeFile(join(project, 'AGENTS.md'), 'agents marker')
      await writeFile(join(project, 'CLAUDE.md'), 'claude marker\n\nDetails: @notes.md')
      await writeFile(join(project, 'notes.md'), 'imported claude body')

      const adapter = new ScriptedAdapter([textResponse('ok')])
      ctx = await takeoverHarness(adapter, claudeHome)
      const agent = await ctx.agentLoop.create(SessionId('takeover'), { provider: 'mock', model: 'mock' }, { cwd: project })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      const first = requestText(adapter.requests[0]!)
      // The workspace loader keeps its own AGENTS.md section.
      expect(first).toContain('agents marker')
      expect(first).toContain('Instructions from: AGENTS.md')
      // CLAUDE.md reaches the model once, from this plugin, with its import expanded.
      expect(first.match(/claude marker/g)).toHaveLength(1)
      expect(first.match(/Instructions from: CLAUDE\.md/g)).toHaveLength(1)
      expect(first).toContain('imported claude body')
      expect(first).not.toContain('@notes.md')
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })

  it('leaves no empty workspace-instruction message when no AGENTS.md exists', async () => {
    const project = await mkdtemp(join(tmpdir(), 'dsh-claude-takeover-'))
    const claudeHome = await mkdtemp(join(tmpdir(), 'dsh-claude-home-'))
    let ctx: Context | undefined
    try {
      await mkdir(join(project, '.git'), { recursive: true })
      await writeFile(join(project, 'CLAUDE.md'), 'claude marker')

      const adapter = new ScriptedAdapter([textResponse('ok'), textResponse('ok')])
      ctx = await takeoverHarness(adapter, claudeHome)
      const agent = await ctx.agentLoop.create(SessionId('takeover-only'), { provider: 'mock', model: 'mock' }, { cwd: project })
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } }))
      await agent.whenIdle()
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'again' }], source: { kind: 'user' } }))
      await agent.whenIdle()

      // The loader's message held nothing but the owned file, so it is dropped
      // rather than left as an empty frame; the memory still reaches the model
      // once, and no second copy appears on the later turn.
      for (const request of adapter.requests) {
        expect(requestText(request).match(/claude marker/g)).toHaveLength(1)
      }
      expect(requestText(adapter.requests[1]!)).not.toContain('<system-reminder>\n\n</system-reminder>')
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })
})
