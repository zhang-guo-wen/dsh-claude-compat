import { describe, expect, it } from 'vitest'
import { sessionStreamFactory, type BtwCardStreamFailure } from '../src/client/btw-card-controller.ts'

/**
 * The one wire frame shape the follower reads. The client build's exported types
 * are not importable here, so the test states the fields it exercises.
 */
interface TestFollowFrame {
  readonly type: string
  readonly event?: unknown
}

/**
 * A `remote.session.follow` that yields the given frames and then stays open
 * until its signal aborts, like the real reconnecting carrier.
 * @param frames - frames to yield in order.
 * @param seen - records the request the follower sent.
 * @param aborted - resolved when the follower disposes the stream.
 * @returns a stand-in client Session remote.
 */
function fakeRemote(
  frames: readonly TestFollowFrame[],
  seen: unknown[],
  aborted: () => void,
): object {
  return {
    session: {
      follow(request: unknown, signal: AbortSignal): AsyncIterable<TestFollowFrame> {
        seen.push(request)
        return (async function* generate() {
          for (const frame of frames) yield frame
          await new Promise<void>(resolve => {
            if (signal.aborted) resolve()
            else signal.addEventListener('abort', () => { resolve() }, { once: true })
          })
          aborted()
        })()
      },
    },
  }
}

/** One durable event frame carrying an assistant message with one text block. */
function assistantFrame(seq: number, text: string): TestFollowFrame {
  return {
    type: 'event',
    event: {
      type: 'assistant/message',
      seq,
      time: seq,
      data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text }] } },
    },
  }
}

describe('sessionStreamFactory', () => {
  it('asks for the raw journal without the assistant-stream opt-in', async () => {
    const seen: unknown[] = []
    let aborted = false
    const stream = sessionStreamFactory(
      fakeRemote([], seen, () => { aborted = true }),
      'child-1' as never,
      () => {},
      () => {},
    )
    await new Promise(resolve => { setTimeout(resolve, 10) })
    // The opt-in is what makes SessionEventStream refuse an opening snapshot
    // without an assistant baseline; the card must not request it.
    expect(seen).toEqual([{ address: { kind: 'session', sessionId: 'child-1' } }])
    stream.dispose()
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(aborted).toBe(true)
  })

  it('publishes each durable event as an append', async () => {
    const changes: unknown[] = []
    const stream = sessionStreamFactory(
      fakeRemote([assistantFrame(7, 'the answer')], [], () => {}),
      'child-2' as never,
      change => { changes.push(change) },
      () => {},
    )
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(changes).toEqual([{
      type: 'append',
      entry: {
        type: 'event',
        event: {
          type: 'assistant/message',
          seq: 7,
          time: 7,
          data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'the answer' }] } },
        },
      },
    }])
    stream.dispose()
  })

  it('ignores frames that carry no event', async () => {
    const changes: unknown[] = []
    const failures: unknown[] = []
    const stream = sessionStreamFactory(
      fakeRemote(
        [{ type: 'assistant-stream' }, { type: 'snapshot', event: undefined }, assistantFrame(2, 'kept')],
        [],
        () => {},
      ),
      'child-3' as never,
      change => { changes.push(change) },
      error => { failures.push(error) },
    )
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(changes).toHaveLength(1)
    expect(failures).toEqual([])
    stream.dispose()
  })

  it('reports a carrier failure once, and stays quiet after disposal', async () => {
    const failures: Error[] = []
    const remote = {
      session: {
        follow(): AsyncIterable<TestFollowFrame> {
          return (async function* generate(): AsyncIterable<TestFollowFrame> {
            throw new Error('carrier lost')
          })()
        },
      },
    }
    const stream = sessionStreamFactory(
      remote,
      'child-4' as never,
      () => {},
      error => { failures.push(error as Error) },
    )
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(failures).toHaveLength(1)
    expect(failures[0]?.message).toBe('carrier lost')
    stream.dispose()
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(failures).toHaveLength(1)
  })

  it('reports an ended carrier as a failure', async () => {
    const failures: Error[] = []
    const remote = {
      session: {
        follow(): AsyncIterable<TestFollowFrame> {
          return (async function* generate(): AsyncIterable<TestFollowFrame> { /* ends immediately */ })()
        },
      },
    }
    const stream = sessionStreamFactory(remote, 'child-5' as never, () => {}, error => { failures.push(error as Error) })
    await new Promise(resolve => { setTimeout(resolve, 10) })
    expect(failures[0]?.message).toBe('session follow ended')
    stream.dispose()
  })
})
