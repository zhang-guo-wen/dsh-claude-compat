import { rmSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { SessionId } from '@deepseek-ai/dsh-session'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import * as SubagentFork from '@deepseek-ai/dsh-subagent-fork-in-process'
import * as commandBtw from '@deepseek-ai/dsh-command-btw'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { MockAdapter, textResponse } from '../../../core/agent-loop/tests/mock-adapter.ts'

const CONFIG = {
  maxQuestionBytes: 4096,
  provider: 'fork',
}

interface Harness {
  readonly ctx: Context
  readonly agent: Agent
  readonly plugin: Awaited<ReturnType<Context['plugin']>>
  readonly cleanup: () => void
}

async function harness(): Promise<Harness> {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  const root = mkdtempSync(join(tmpdir(), 'dsh-command-btw-'))
  await ctx.plugin(JsonlSessionPersistence, { root })
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(SubagentFork, { providerName: 'fork' })
  await ctx.plugin(CommandRuntime)
  const adapter = new MockAdapter([textResponse('answer from the child')])
  ctx.llm.registerAdapter(['mock'], adapter)
  const plugin = await ctx.plugin(commandBtw, CONFIG)
  const agent = await ctx.agentLoop.create(
    SessionId(`command-btw-${Math.random()}`),
    { provider: 'mock', model: 'mock' },
  )
  return { ctx, agent, plugin, cleanup: () => { rmSync(root, { recursive: true, force: true }) } }
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}

/** Drive the parent agent through one completed turn so it has balanced history. */
async function completeOneTurn(ctx: Context, agent: Agent, text: string): Promise<void> {
  const idle = waitForIdle(ctx, agent)
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
  await idle
}

/** Execute `/btw` through the same registry boundary as a UI adapter. */
async function run(test: Harness, suffix = ''): Promise<{ kind: string; text?: string }> {
  const settled = await test.ctx.commands.execute(
    test.agent,
    `/btw${suffix}`,
    [],
    new AbortController().signal,
  )
  if (settled === undefined) throw new Error('btw command was not registered')
  return settled.result
}

describe('@deepseek-ai/dsh-command-btw registration', () => {
  it('registers one global command with Loader-safe exports and disposes it', async () => {
    const test = await harness()
    try {
      expect(commandBtw.name).toBe('command-btw')
      expect(commandBtw.inject).toEqual(['commands', 'sessionProjections', 'subagents'])
      expect('default' in commandBtw).toBe(false)
      const loader = Object.create(Loader.prototype) as Loader
      expect(loader.unwrapExports(commandBtw)).toBe(commandBtw)

      expect(test.ctx.commands.list(test.agent)).toContainEqual({
        name: 'btw',
        description: 'by the way: fork a child subagent to answer a side question',
        input: { hint: '<question>' },
      })
      expect(test.ctx.commands.find(test.agent, 'btw')).toMatchObject({ recordInput: false })

      await test.plugin.dispose()
      expect(test.ctx.commands.find(test.agent, 'btw')).toBeUndefined()
    } finally {
      test.cleanup()
    }
  })
})

describe('/btw fork command', () => {
  it('refuses an empty and whitespace-only question', async () => {
    const test = await harness()
    try {
      expect(await run(test)).toEqual({ kind: 'error', text: 'A question is required. Usage: /btw <question>' })
      expect(await run(test, '   \n\t ')).toEqual({ kind: 'error', text: 'A question is required. Usage: /btw <question>' })
    } finally {
      test.cleanup()
    }
  })

  it('refuses a question that exceeds the configured byte limit', async () => {
    const test = await harness()
    try {
      const oversized = 'x'.repeat(CONFIG.maxQuestionBytes + 1)
      expect(await run(test, ` ${oversized}`)).toEqual({
        kind: 'error',
        text: `The question exceeds the ${CONFIG.maxQuestionBytes}-byte limit.`,
      })
    } finally {
      test.cleanup()
    }
  })

  it('refuses to fork when the session has no completed turn', async () => {
    const test = await harness()
    try {
      expect(await run(test, ' is that right?')).toEqual({
        kind: 'error',
        text: '/btw requires at least one completed turn to fork from; finish a turn first.',
      })
    } finally {
      test.cleanup()
    }
  })

  it('refuses to fork while a turn is still open', async () => {
    const test = await harness()
    try {
      await completeOneTurn(test.ctx, test.agent, 'first turn')
      // Open a second turn and ask /btw before it closes; the turn is still open.
      const idle = waitForIdle(test.ctx, test.agent)
      test.agent.followup(createUserMessage({ content: [{ type: 'text', text: 'second turn' }], source: { kind: 'user' } }))
      await expect(run(test, ' side q?')).resolves.toEqual({
        kind: 'error',
        text: '/btw requires a balanced history; wait for the current turn to finish before forking a side question.',
      })
      await idle
    } finally {
      test.cleanup()
    }
  })

  it('forks a continuable child and records btw/spawn with the child id', async () => {
    const test = await harness()
    try {
      await completeOneTurn(test.ctx, test.agent, 'first turn')
      const result = await run(test, '  what language is this project?  ')
      expect(result.kind).toBe('success')
      const childId = /^Started \/btw as child session (\S+)\./.exec(result.text ?? '')?.[1]
      expect(childId).toBeTruthy()

      const spawn = test.agent.session.snapshotEvents().find(event => event.type === 'btw/spawn')
      expect(spawn?.type === 'btw/spawn' && spawn.data.childId).toBe(childId)
      expect(spawn?.type === 'btw/spawn' && spawn.data.question).toBe('what language is this project?')
      // The parent session does not surface the question as a model message.
      expect(test.agent.session.deriveMessages().some(m => m.role === 'user'
        && m.content.some(b => b.type === 'text' && b.text.includes('what language')))).toBe(false)
      // No model request was sent from the parent session to answer the question.
      expect(test.agent.session.snapshotEvents().filter(event => event.type === 'user/message')
        .some(event => event.data.content.some(b => b.type === 'text' && b.text.includes('what language')))).toBe(false)
    } finally {
      test.cleanup()
    }
  })

  it('keeps command bookkeeping around the authoritative btw/spawn event', async () => {
    const test = await harness()
    try {
      await completeOneTurn(test.ctx, test.agent, 'first turn')
      await run(test, ' language?')
      const commandRun = test.agent.session.snapshotEvents().find(event => event.type === 'command/run')
      expect(commandRun?.type === 'command/run' && Object.hasOwn(commandRun.data, 'args')).toBe(false)
    } finally {
      test.cleanup()
    }
  })
})

describe('config validation', () => {
  it('applies library defaults when limits are omitted', () => {
    const resolved = commandBtw.resolveConfig({})
    expect(resolved.maxQuestionBytes).toBe(4096)
    expect(resolved.provider).toBe('fork')
  })

  it('rejects unknown config keys', () => {
    expect(() => commandBtw.resolveConfig({ extra: 1 } as unknown as commandBtw.Config))
      .toThrow('unknown config key "extra"')
  })

  it('rejects a non-positive question limit', () => {
    expect(() => commandBtw.resolveConfig({ maxQuestionBytes: 0 }))
      .toThrow('maxQuestionBytes must be a positive integer')
  })

  it('rejects an empty provider', () => {
    expect(() => commandBtw.resolveConfig({ provider: '' }))
      .toThrow('provider must be a non-empty string')
  })
})
