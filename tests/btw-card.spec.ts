import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { childSessionOf, startedText, STARTED_PREFIX } from '../src/btw-receipt.ts'
import { BtwCardRegistry, type BtwCardSnapshot, type BtwCardStream } from '../src/client/btw-card-controller.ts'

const ASKER = 'parent-1'
const OTHER = 'parent-2'

/** One published journal change, shaped like the stream's `publish` argument. */
function append(type: string, data: unknown): unknown {
  return { type: 'append', entry: { type: 'event', event: { type, data } } }
}

/** An assistant message entry carrying one text block. */
function assistant(text: string): unknown {
  return append('assistant/message', { message: { role: 'assistant', content: [{ type: 'text', text }] } })
}

describe('btw receipt text', () => {
  it('round-trips the forked Session id', () => {
    expect(childSessionOf({ kind: 'success', text: startedText('child-1') })).toBe('child-1')
  })

  it('reads no Session from an error or unrelated success', () => {
    expect(childSessionOf({ kind: 'error', text: startedText('child-1') })).toBeNull()
    expect(childSessionOf({ kind: 'success', text: 'Started /other as child session x.' })).toBeNull()
    expect(childSessionOf({ kind: 'success' })).toBeNull()
  })

  it('anchors the acknowledgement wording', () => {
    expect(startedText('abc')).toBe(`${STARTED_PREFIX}abc. The answer and any follow-up live there.`)
  })
})

describe('BtwCardRegistry', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  /**
   * Build a registry whose streams are driven by the test.
   * @param archiveOutcomes - optional per-call fulfill/reject plan for the archive command.
   * @returns the registry, per-stream sinks, archive calls, and stream disposals.
   */
  function harness(archiveOutcomes: readonly boolean[] = []): {
    cards: BtwCardRegistry
    snapshot: (sessionId?: string) => BtwCardSnapshot | undefined
    push: (change: unknown, streamIndex?: number) => void
    failStream: (error: unknown, streamIndex?: number) => void
    archived: string[]
    disposed: () => number
  } {
    const sinks: Array<(change: unknown) => void> = []
    const failures: Array<(error: unknown) => void> = []
    let disposes = 0
    const archived: string[] = []
    let call = 0
    const cards = new BtwCardRegistry(
      (_sessionId, onChange, onFailure): BtwCardStream => {
        sinks.push(change => { onChange(change as never) })
        failures.push(onFailure)
        return { dispose: () => { disposes += 1 } }
      },
      sessionId => {
        const succeeds = archiveOutcomes[call] ?? true
        call += 1
        if (!succeeds) return Promise.reject(new Error('session is not listed yet'))
        archived.push(String(sessionId))
        return Promise.resolve()
      },
    )
    const last = <T>(values: readonly T[]): T => {
      const value = values.at(-1)
      if (value === undefined) throw new Error('no stream was opened')
      return value
    }
    return {
      cards,
      snapshot: (sessionId = ASKER) => cards.observable().getSnapshot().cards[sessionId],
      push: (change, streamIndex) => {
        (streamIndex === undefined ? last(sinks) : sinks[streamIndex] ?? last(sinks))(change)
      },
      failStream: (error, streamIndex) => {
        (streamIndex === undefined ? last(failures) : failures[streamIndex] ?? last(failures))(error)
      },
      archived,
      disposed: () => disposes,
    }
  }

  it('exposes one stable source for every entry', () => {
    const test = harness()
    const before = test.cards.observable()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-1') })
    // A source created only on first dispatch could never be bound by an entry
    // that already rendered, so the identity must not change.
    expect(test.cards.observable()).toBe(before)
  })

  it('gives no card to a Session that never asked', () => {
    const test = harness()
    expect(test.snapshot(OTHER)).toBeUndefined()
  })

  it('ignores outcomes for other commands', () => {
    const test = harness()
    test.cards.observe(ASKER, 'plan', { kind: 'success', text: startedText('child-1') })
    expect(test.snapshot(ASKER)).toBeUndefined()
  })

  it('keys the card to the asking Session, not to the forked one', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-7') })
    expect(test.snapshot(ASKER)).toMatchObject({ childSessionId: 'child-7', phase: 'watching' })
    // Another open Session must not render the same card.
    expect(test.snapshot(OTHER)).toBeUndefined()
    // Nor does the forked Session itself.
    expect(test.snapshot('child-7')).toBeUndefined()
  })

  it('follows the forked Session, accumulates the answer, then archives on turn end', async () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-7') })
    expect(test.snapshot()).toMatchObject({ childSessionId: 'child-7', phase: 'watching', answer: '' })
    test.push(assistant('first half'))
    expect(test.snapshot()?.answer).toBe('first half')
    test.push(assistant('second half'))
    expect(test.snapshot()?.answer).toBe('first half\n\nsecond half')
    test.push(append('turn/end', { turn: 1 }))
    expect(test.snapshot()?.phase).toBe('answered')
    await Promise.resolve()
    expect(test.archived).toEqual(['child-7'])
    vi.advanceTimersByTime(6000)
    expect(test.snapshot()?.childSessionId).toBeNull()
  })

  it('surfaces a failed dispatch and dismisses itself', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'error', text: 'no completed turn' })
    expect(test.snapshot()).toMatchObject({ phase: 'failed', error: 'no completed turn', childSessionId: null })
    vi.advanceTimersByTime(6000)
    expect(test.snapshot()?.error).toBeNull()
  })

  it('replaces the previous question when the same Session asks again', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('first') })
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('second') })
    expect(test.snapshot()?.childSessionId).toBe('second')
    // A late publication from the replaced stream must not reach the card.
    test.push(assistant('stale answer'), 0)
    expect(test.snapshot()?.answer).toBe('')
  })

  it('keeps the cards of two Sessions independent', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-a') })
    test.cards.observe(OTHER, 'btw', { kind: 'success', text: startedText('child-b') })
    test.push(assistant('answer A'), 0)
    test.push(assistant('answer B'), 1)
    expect(test.snapshot(ASKER)).toMatchObject({ childSessionId: 'child-a', answer: 'answer A' })
    expect(test.snapshot(OTHER)).toMatchObject({ childSessionId: 'child-b', answer: 'answer B' })
    // Closing one card leaves the other untouched.
    test.cards.dismiss(ASKER)
    expect(test.snapshot(ASKER)?.childSessionId).toBeNull()
    expect(test.snapshot(OTHER)?.answer).toBe('answer B')
  })

  it('leaves a closed card in the shared snapshot until dispose', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-9') })
    test.cards.dismiss(ASKER)
    expect(test.snapshot(ASKER)?.childSessionId).toBeNull()
    vi.advanceTimersByTime(60_000)
    expect(test.snapshot(ASKER)?.childSessionId).toBeNull()
    test.cards.dispose()
    expect(test.snapshot(ASKER)).toBeUndefined()
  })

  it('dismisses without archiving and releases the stream', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-9') })
    test.cards.dismiss(ASKER)
    expect(test.snapshot(ASKER)?.childSessionId).toBeNull()
    expect(test.archived).toEqual([])
    expect(test.disposed()).toBeGreaterThan(0)
  })

  it('surfaces a stream failure instead of watching forever', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-broken') })
    expect(test.snapshot()?.phase).toBe('watching')
    test.failStream(new Error('session not found'))
    expect(test.snapshot()).toMatchObject({ phase: 'failed', error: 'session not found' })
  })

  it('retries an archive the Host refused because the Session was not listed yet', async () => {
    const test = harness([false, true])
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-late') })
    test.push(append('turn/end', { turn: 1 }))
    await Promise.resolve()
    expect(test.archived).toEqual([])
    await vi.advanceTimersByTimeAsync(1500)
    expect(test.archived).toEqual(['child-late'])
  })

  it('leaves the Session listed when both archive attempts are refused', async () => {
    const test = harness([false, false])
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-doomed') })
    test.push(append('turn/end', { turn: 1 }))
    await vi.advanceTimersByTimeAsync(1500)
    expect(test.archived).toEqual([])
    expect(test.snapshot()?.phase).toBe('answered')
  })

  it('releases every card on dispose', () => {
    const test = harness()
    test.cards.observe(ASKER, 'btw', { kind: 'success', text: startedText('child-1') })
    test.cards.observe(OTHER, 'btw', { kind: 'success', text: startedText('child-2') })
    test.cards.dispose()
    expect(test.snapshot(ASKER)).toBeUndefined()
    expect(test.snapshot(OTHER)).toBeUndefined()
    expect(test.disposed()).toBe(2)
  })
})
