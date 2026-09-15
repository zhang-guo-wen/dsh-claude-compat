/**
 * `/btw` answer card state: watches the client command lifecycle for a
 * successful `/btw` dispatch, follows the forked Session it names, and derives
 * the one answer to present.
 *
 * The Host `/btw` handler owns the fork and the prompt. This registry owns only
 * presentation: it reads the forked Session through the Session journal stream
 * (no navigation, no session selection), publishes one plain snapshot per
 * SESSION THAT ASKED, and archives the forked Session once its answer turn
 * closes. The archived Session keeps its own answer; the card only stops
 * showing it.
 *
 * The card is keyed by the Session that dispatched the command, never by the
 * forked Session: the overlay entry renders once per open Session, so one shared
 * snapshot would paint the same card into every window.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/client/btw-card-controller
 */

import { createSnapshotStore, type ObservableSnapshot, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionEventLikeEntry, SessionJournalChange } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { childSessionOf } from '../btw-receipt.ts'

/** Lifecycle stage of one card. */
export type BtwCardPhase = 'watching' | 'answered' | 'failed'

/** Everything one card renders. */
export interface BtwCardSnapshot {
  /** The forked Session whose answer the card shows; null while closed. */
  readonly childSessionId: SessionId | null
  readonly phase: BtwCardPhase
  /** Assistant text accumulated for the answer turn. */
  readonly answer: string
  /** Human-readable failure, or null. */
  readonly error: string | null
}

/**
 * Every card this client currently has, keyed by the Session that asked.
 *
 * One stable source carries all of them. A per-Session source cannot be bound:
 * the overlay entry renders before any `/btw` dispatch exists, so a hook bound
 * to the then-absent source would never re-bind to one created later.
 */
export interface BtwCardsSnapshot {
  readonly cards: Readonly<Record<string, BtwCardSnapshot>>
}

/** The card shown for a Session that has none; also the closed state. */
const NO_CARD: BtwCardSnapshot = { childSessionId: null, phase: 'watching', answer: '', error: null }

/** One open Session journal stream owned by a card. */
export interface BtwCardStream {
  /** Permanently stop the stream. */
  dispose(): void
}

/**
 * Publish one stream problem the card can show. A stream that fails to open
 * would otherwise leave the card watching forever with nothing to explain it.
 */
export type BtwCardStreamFailure = (error: unknown) => void

/** How long a finished card stays visible after its Session is archived. */
const ANSWER_LINGER_MS = 6000

/** Delay before retrying an archive the Host refused as not-yet-listed. */
const ARCHIVE_RETRY_MS = 1500

/** Upper bound on the presented answer, in Unicode code points. */
const MAX_ANSWER_CODE_POINTS = 4000

/** Whether one journal entry carries an assistant text block. */
function assistantText(entry: SessionEventLikeEntry): string | null {
  if (entry.type !== 'event' || entry.event.type !== 'assistant/message') return null
  const texts: string[] = []
  for (const block of entry.event.data.message.content) {
    if (block.type === 'text') texts.push(block.text)
  }
  return texts.length === 0 ? null : texts.join('\n\n')
}

/** One card's own runtime: its stream, generation, and dismissal timer. */
interface CardRuntime {
  readonly stream: BtwCardStream
  /** Guards late publications after this card was replaced or closed. */
  settled: boolean
  dismissTimer: ReturnType<typeof setTimeout> | undefined
}

/**
 * Owns one `/btw` answer card per asking Session.
 *
 * Construct one per client runtime; the plugin body closes over it, resolves the
 * overlay entry's keyed hook source through {@link observable}, and disposes it
 * with the plugin fiber.
 */
export class BtwCardRegistry {
  /** The one stable source every overlay entry binds to. */
  private readonly store: SnapshotStore<BtwCardsSnapshot> = createSnapshotStore<BtwCardsSnapshot>({ cards: {} })
  private readonly cards = new Map<string, CardRuntime>()
  /** Dismissals published by a failure that never had a stream. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  /**
   * @param openStream - opens the journal stream for one forked Session.
   * @param archiveSession - archives a forked Session once its answer lands.
   */
  constructor(
    private readonly openStream: (
      sessionId: SessionId,
      onChange: (change: SessionJournalChange) => void,
      onFailure: BtwCardStreamFailure,
    ) => BtwCardStream,
    private readonly archiveSession: (sessionId: SessionId) => Promise<void>,
  ) {}

  /**
   * The stable source the card entry binds. It always exists, so a hook bound
   * before the first `/btw` dispatch still sees every later card.
   * @returns every card this client currently holds.
   */
  observable(): ObservableSnapshot<BtwCardsSnapshot> {
    return this.store
  }

  /**
   * Handle one client command outcome. Outcomes for other commands are ignored.
   * @param sessionId - the Session that dispatched the command.
   * @param name - the submitted command name.
   * @param result - the Host handler's settled result.
   */
  observe(sessionId: string, name: string, result: CommandResult): void {
    if (name !== 'btw') return
    const childSessionId = childSessionOf(result)
    if (childSessionId === null) {
      this.fail(sessionId, result.kind === 'error'
        ? result.text ?? 'The side question failed.'
        : 'The side question named no session.')
      return
    }
    this.watch(sessionId, childSessionId as SessionId)
  }

  /** Close one Session's card without archiving its forked Session. */
  dismiss(sessionId: string): void {
    this.close(sessionId)
  }

  /** Release every stream and timer and close every card. */
  dispose(): void {
    for (const sessionId of [...this.cardIds()]) this.closeRuntime(sessionId)
    this.store.set({ cards: {} })
  }

  /** Present one failure in the asking Session and schedule its dismissal. */
  private fail(sessionId: string, message: string): void {
    this.closeRuntime(sessionId)
    this.emitCard(sessionId, { ...NO_CARD, phase: 'failed', error: message })
    this.scheduleClose(sessionId)
  }

  /** Start following one forked Session; a later question replaces that card. */
  private watch(sessionId: string, childSessionId: SessionId): void {
    this.closeRuntime(sessionId)
    this.emitCard(sessionId, { ...NO_CARD, childSessionId })
    let runtime: CardRuntime | undefined
    const stream = this.openStream(childSessionId, (change) => {
      if (runtime === undefined || runtime.settled || this.cards.get(sessionId) !== runtime) return
      if (change.type === 'replace' || change.type === 'prepend') {
        this.absorb(sessionId, change.entries)
        return
      }
      if (change.type !== 'append') return
      if (change.entry.event.type === 'turn/end') {
        runtime.settled = true
        this.settle(sessionId, childSessionId, runtime)
        return
      }
      this.absorb(sessionId, [change.entry])
    }, error => {
      if (runtime === undefined || runtime.settled) return
      runtime.settled = true
      this.fail(sessionId, error instanceof Error ? error.message : String(error))
    })
    runtime = { stream, settled: false, dismissTimer: undefined }
    this.cards.set(sessionId, runtime)
  }

  /** Fold one batch of journal entries into the asking Session's answer. */
  private absorb(sessionId: string, entries: readonly SessionEventLikeEntry[]): void {
    const current = this.card(sessionId)
    if (current === undefined) return
    let answer = current.answer
    for (const entry of entries) {
      const text = assistantText(entry)
      if (text === null) continue
      answer = answer.length === 0 ? text : `${answer}\n\n${text}`
    }
    if (answer === current.answer) return
    this.emitCard(sessionId, { ...current, answer: [...answer].slice(0, MAX_ANSWER_CODE_POINTS).join('') })
  }

  /** Publish the finished answer and archive the Session that owns it. */
  private settle(sessionId: string, childSessionId: SessionId, runtime: CardRuntime): void {
    runtime.stream.dispose()
    const current = this.card(sessionId)
    if (current !== undefined) this.emitCard(sessionId, { ...current, phase: 'answered' })
    void this.archive(childSessionId, sessionId, runtime)
    this.scheduleClose(sessionId)
  }

  /**
   * Archive the answered Session, retrying once: a Session the Host has only
   * just forked may not be in the registry-global list yet, and the archive
   * command refuses an id that is neither live nor listed.
   * @param childSessionId - the forked Session to archive.
   * @param sessionId - the asking Session whose card requested this archive.
   * @param runtime - the card that requested it.
   */
  private async archive(childSessionId: SessionId, sessionId: string, runtime: CardRuntime): Promise<void> {
    try {
      await this.archiveSession(childSessionId)
      return
    } catch {
      // Retry below; a second failure leaves the Session listed.
    }
    await new Promise<void>(resolve => { setTimeout(resolve, ARCHIVE_RETRY_MS) })
    if (this.cards.get(sessionId) !== runtime) return
    try {
      await this.archiveSession(childSessionId)
    } catch {
      // The card already presented its answer; a failed archive leaves the
      // Session listed, which is exactly the state a manual archive would reach.
    }
  }

  /** Schedule one card's own dismissal. */
  private scheduleClose(sessionId: string): void {
    const timer = setTimeout(() => {
      this.timers.delete(sessionId)
      this.close(sessionId)
    }, ANSWER_LINGER_MS)
    const runtime = this.cards.get(sessionId)
    if (runtime === undefined) this.timers.set(sessionId, timer)
    else runtime.dismissTimer = timer
  }

  /**
   * Reset one Session's card to the closed snapshot and release its stream. The
   * closed entry stays in the shared snapshot: the component reads the same
   * state whether the entry is closed or absent, and dropping it would race the
   * card's own dismissal. {@link dispose} clears the map.
   */
  private close(sessionId: string): void {
    this.closeRuntime(sessionId)
    const current = this.card(sessionId)
    if (current === undefined) return
    this.emitCard(sessionId, { ...NO_CARD })
  }

  /** Release one Session's stream and pending dismissal. */
  private closeRuntime(sessionId: string): void {
    const timer = this.cards.get(sessionId)?.dismissTimer ?? this.timers.get(sessionId)
    if (timer !== undefined) clearTimeout(timer)
    this.timers.delete(sessionId)
    const runtime = this.cards.get(sessionId)
    if (runtime === undefined) return
    runtime.settled = true
    runtime.stream.dispose()
    this.cards.delete(sessionId)
  }

  /** Every Session id with a card or a pending dismissal. */
  private cardIds(): Set<string> {
    return new Set([...Object.keys(this.store.getSnapshot().cards), ...this.cards.keys(), ...this.timers.keys()])
  }

  /** One Session's published card, or undefined when it has none. */
  private card(sessionId: string): BtwCardSnapshot | undefined {
    return this.store.getSnapshot().cards[sessionId]
  }

  /** Publish one Session's card, or drop it. */
  private emitCard(sessionId: string, snapshot: BtwCardSnapshot): void {
    this.publish(sessionId, snapshot)
  }

  /** Replace the shared snapshot, removing one Session's entry when absent. */
  private publish(sessionId: string, snapshot: BtwCardSnapshot | undefined): void {
    const cards = { ...this.store.getSnapshot().cards }
    if (snapshot === undefined) delete cards[sessionId]
    else cards[sessionId] = snapshot
    this.store.set({ cards })
  }
}

/** One event-bearing frame of the client `remote.session.follow` wire. */
interface FollowFrame {
  readonly type: string
  readonly cursor?: number
  readonly records?: readonly SessionEventLikeEntry[]
  readonly event?: unknown
}

/** The one `remote.session` namespace member this follower calls. */
interface SessionFollowRemote {
  readonly session: {
    follow(
      request: { address: { kind: 'session'; sessionId: string } },
      signal: AbortSignal,
    ): AsyncIterable<FollowFrame>
  }
}

/**
 * Follow one Session's event journal for the card.
 *
 * This deliberately does not use `SessionEventStream`: that class requests the
 * process-local assistant stream and refuses an opening snapshot without the
 * matching baseline, which is unavailable on deployments that do not publish
 * one — the stream then never opens and the card has nothing to show. The card
 * only needs durable events, so it reads the raw journal without that opt-in.
 *
 * @param remote - the client `ctx.remote.session` namespace value.
 * @param sessionId - the forked Session to follow.
 * @param onChange - publication sink for durable entries.
 * @param onFailure - terminal failure sink (open or carrier failure).
 * @returns the stream handle.
 */
function followSession(
  remote: object,
  sessionId: string,
  onChange: (change: SessionJournalChange) => void,
  onFailure: BtwCardStreamFailure,
): BtwCardStream {
  const abort = new AbortController()
  const sessionRemote = remote as SessionFollowRemote
  void (async () => {
    try {
      for await (const frame of sessionRemote.session.follow(
        { address: { kind: 'session', sessionId } },
        abort.signal,
      )) {
        if (frame.type !== 'event' || frame.event === undefined) continue
        onChange({
          type: 'append',
          entry: { type: 'event', event: frame.event as SessionEventLikeEntry['event'] },
        } as SessionJournalChange)
      }
    } catch (error: unknown) {
      if (abort.signal.aborted) return
      onFailure(error)
      return
    }
    if (!abort.signal.aborted) onFailure(new Error('session follow ended'))
  })()
  return { dispose: () => { abort.abort() } }
}

/**
 * Follow one Session's journal for the card, bound to the client Session remote.
 * @param remote - the client `ctx.remote.session` namespace value.
 * @param sessionId - the forked Session to follow.
 * @param onChange - publication sink for durable entries.
 * @param onFailure - terminal failure sink (open or carrier failure).
 * @returns the stream handle.
 */
export function sessionStreamFactory(
  remote: object,
  sessionId: SessionId,
  onChange: (change: SessionJournalChange) => void,
  onFailure: BtwCardStreamFailure,
): BtwCardStream {
  return followSession(remote, String(sessionId), onChange, onFailure)
}
