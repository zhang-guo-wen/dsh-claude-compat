/**
 * The `/btw` answer card, rendered into `conversation.input.overlay` inside the
 * composer card. It shows the follow state while the forked Session answers,
 * then the answer itself, and closes on its own after the registry's linger
 * window.
 *
 * The shared source is keyed by the Session that asked, so only that Session's
 * composer renders a card.
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { BtwCardsSnapshot } from './btw-card-controller.ts'
import type { NS } from './locales-btw.ts'
import css from './BtwCard.module.css'

/** Injected business face of the overlay entry. */
export interface BtwCardInjected {
  /** The one shared card source, bound to the `useBtwCard` selector hook. */
  hooks: { btwCard: ObservableSnapshot<BtwCardsSnapshot> }
  dismiss(sessionId: string): void
}

/** Full card props: the runtime share, the bound hook, and the locale seat. */
export type BtwCardProps =
  & PropsRuntime<'conversation.input.overlay'>
  & Omit<InjectFace<BtwCardInjected>, 'renderSlot'>
  & PropsLocale<typeof NS>

/**
 * Render the answer card for one Session.
 * @param props - shared card source, dismissal callback, and `t`.
 * @returns the card while it has something to show; null while closed.
 */
export function BtwCard({ useBtwCard, dismiss, t, sessionId }: BtwCardProps) {
  // The shared source is stable, so the hook re-reads it on every card change;
  // a per-Session source created on first dispatch could never be bound.
  const state = useBtwCard(cards => cards.cards[String(sessionId)])
  if (state === undefined || state.childSessionId === null) return null
  const status = state.phase === 'watching'
    ? t('status.watching')
    : state.phase === 'answered' ? t('status.answered') : t('status.failed')
  return (
    <section className={css.card} aria-label={t('card.aria')} aria-live="polite">
      <header className={css.header}>
        <span className={css.title}>{t('card.title')}</span>
        <span className={css.status}>{status}</span>
        <button
          type="button"
          className={css.dismiss}
          aria-label={t('card.dismiss')}
          onClick={() => { dismiss(String(sessionId)) }}
        >
          ×
        </button>
      </header>
      {state.error !== null && <p className={css.error} role="alert">{state.error}</p>}
      {state.answer.length > 0 && <p className={css.answer}>{state.answer}</p>}
    </section>
  )
}
