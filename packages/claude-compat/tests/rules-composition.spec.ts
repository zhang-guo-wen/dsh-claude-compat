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
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as ClaudeCompat from '../src/index.ts'

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
  await ctx.plugin(ClaudeCompat, { claudeHome, projectRootMarkers: ['.git'] })
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

describe('real agent-loop Claude rules injection', () => {
  it('folds Claude rules into the first request once, not the second', async () => {
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

      // The rules are injected exactly once: only one `claude-code` user message
      // lands on the session surface, so later turns carry it in history but never
      // add a second copy.
      const claudeCodeMessages = agent.session.snapshotEvents()
        .filter((event): event is Extract<ReturnType<typeof agent.session.snapshotEvents>[number], { type: 'user/message' }> =>
          event.type === 'user/message' && event.data.source.kind === 'claude-code')
      expect(claudeCodeMessages.length).toBe(1)
    } finally {
      await rm(project, { recursive: true, force: true })
      await rm(claudeHome, { recursive: true, force: true })
      await ctx?.fiber.dispose()
    }
  })
})
