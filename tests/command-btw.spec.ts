import { describe, expect, it } from 'vitest'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { apply as applyBtw, resolveConfig } from '../src/command-btw.ts'
import { STARTED_PREFIX } from '../src/btw-receipt.ts'

/**
 * The `turnBoundary` state `/btw` reads. Declared here because the plugin's own
 * dependency set does not carry the `@deepseek-ai/dsh-agent` projection types.
 */
interface TurnState {
  openTurnStartSeq: number | null
  lastStepStartSeq: number | null
  lastStepBoundary: { kind: 'start' | 'end'; seq: number } | null
  lastTurn: number
}

/** The registration metadata `/btw` publishes. */
interface Registration {
  name: string
  description: string
  recordInput?: boolean
  handler: (invocation: unknown) => Promise<CommandResult>
}

/** One recorded session-controller call. */
type ControllerCall =
  | { op: 'fork'; sessionId: string }
  | { op: 'prompt'; sessionId: string; mode: string; text: string }

const EMPTY_STEPS = { lastStepStartSeq: null, lastStepBoundary: null }

/**
 * Run the real `/btw` registration against a hand-built context, so the check
 * needs no command runtime beyond the `register`/`invocation` surface. The
 * plugin's dependency tree omits several transitive `@deepseek-ai/*` packages,
 * so mounting `@deepseek-ai/dsh-commands` is not an option here.
 * @param turn - the projection state `/btw` observes for the receiving session.
 * @returns the published definition, recorded controller calls, and a runner.
 */
function harness(turn: TurnState): {
  registration: Registration
  calls: ControllerCall[]
  run: (line: string) => Promise<CommandResult>
} {
  let registration!: Registration
  const calls: ControllerCall[] = []
  const ctx = {
    get: (service: string) => service === 'sessionController'
      ? {
          fork: async (request: { sessionId: string }) => {
            calls.push({ op: 'fork', sessionId: request.sessionId })
            return { sessionId: 'btw-child-1' }
          },
          prompt: async (request: { sessionId: string; mode: string; content: Array<{ text: string }> }) => {
            calls.push({
              op: 'prompt',
              sessionId: request.sessionId,
              mode: request.mode,
              text: request.content[0]?.text ?? '',
            })
            return { accepted: true }
          },
        }
      : undefined,
    commands: { register: (definition: Registration) => { registration = definition; return () => {} } },
    sessionProjections: { stateOf: (_session: unknown, key: string) => key === 'turnBoundary' ? turn : undefined },
  }
  applyBtw(ctx as never, {})
  const agent = {
    session: {
      id: 'parent-1',
      append: () => { throw new Error('/btw must not write a plugin-owned session event') },
    },
  }
  return {
    registration,
    calls,
    run: line => registration.handler({ agent, rawInput: line.replace(/^\/btw/, ''), signal: new AbortController().signal }),
  }
}

describe('/btw registration', () => {
  it('records the question through the executor lifecycle instead of a plugin event', () => {
    const test = harness({ openTurnStartSeq: 12, ...EMPTY_STEPS, lastTurn: 2 })
    expect(test.registration.name).toBe('btw')
    expect(test.registration.recordInput).toBe(true)
  })
})

describe('/btw fork dispatch', () => {
  it('forks the receiving session and prompts the new one while a later turn is open', async () => {
    const test = harness({ openTurnStartSeq: 12, ...EMPTY_STEPS, lastTurn: 2 })
    await expect(test.run('/btw what language is this?')).resolves.toEqual({
      kind: 'success',
      text: `${STARTED_PREFIX}btw-child-1. The answer and any follow-up live there.`,
    })
    expect(test.calls).toEqual([
      { op: 'fork', sessionId: 'parent-1' },
      {
        op: 'prompt',
        sessionId: 'btw-child-1',
        mode: 'queue',
        text: 'Answer this side question from the forked session context: what language is this?',
      },
    ])
  })

  it('refuses while the first turn is still open, because no fork anchor exists yet', async () => {
    const test = harness({ openTurnStartSeq: 0, ...EMPTY_STEPS, lastTurn: 1 })
    await expect(test.run('/btw side question?')).resolves.toEqual({
      kind: 'error',
      text: '/btw requires at least one completed turn to fork from; finish a turn first.',
    })
    expect(test.calls).toEqual([])
  })

  it('refuses a session that has recorded no turn at all', async () => {
    const test = harness({ openTurnStartSeq: null, ...EMPTY_STEPS, lastTurn: 0 })
    await expect(test.run('/btw side question?')).resolves.toMatchObject({ kind: 'error' })
    expect(test.calls).toEqual([])
  })

  it('refuses an empty question before touching the session controller', async () => {
    const test = harness({ openTurnStartSeq: null, ...EMPTY_STEPS, lastTurn: 3 })
    await expect(test.run('/btw   ')).resolves.toEqual({
      kind: 'error',
      text: 'A question is required. Usage: /btw <question>',
    })
    expect(test.calls).toEqual([])
  })
})

describe('/btw config validation', () => {
  it('applies the library default when the cap is omitted', () => {
    expect(resolveConfig({}).maxQuestionBytes).toBe(4096)
  })

  it('rejects the removed subagent provider key', () => {
    expect(() => resolveConfig({ provider: 'fork' } as never))
      .toThrow('unknown config key "provider"')
  })

  it('rejects a non-positive question limit', () => {
    expect(() => resolveConfig({ maxQuestionBytes: 0 }))
      .toThrow('maxQuestionBytes must be a positive integer')
  })
})
