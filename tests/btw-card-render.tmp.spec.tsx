// @vitest-environment jsdom
/**
 * Throwaway spec: does the card component re-render when the shared card source
 * publishes? `useBtwCard` below is the renderer's own adapter over the real
 * store (useSyncExternalStore + subscribeWithSelector-equivalent selector), so
 * this reproduces what production does between the store and the component.
 *
 * Runs through the Harness checkout's `vitest.plugin-compat.config.ts`, which
 * supplies both React and `@deepseek-ai/dsh-*` resolution.
 */
import { describe, expect, it } from 'vitest'
import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { BtwCard } from '../src/client/BtwCard.tsx'
import { BtwCardRegistry, type BtwCardStream } from '../src/client/btw-card-controller.ts'
import { startedText } from '../src/btw-receipt.ts'

/** The renderer's selector-hook adapter over one host observable. */
function bind<Snapshot>(source: {
  subscribe(listener: () => void): () => void
  getSnapshot(): Snapshot
}) {
  return <Selected,>(selector: (snapshot: Snapshot) => Selected): Selected =>
    useSyncExternalStore(
      listener => source.subscribe(listener),
      () => selector(source.getSnapshot()),
    )
}

const SESSION = 'parent-1'

/**
 * Mount the card with its injected face.
 * @param store - the shared card source.
 * @param sessions - every Session id the mounted overlay entry belongs to.
 * @returns the rendered text and a re-render trigger.
 */
async function mount(store: ReturnType<typeof createSnapshotStore<never>>, sessions: readonly string[]) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (): void => {
    root.render(
      createElement(
        'div',
        null,
        ...sessions.map(sessionId => createElement(BtwCard as never, {
          key: sessionId,
          useBtwCard: bind(store),
          dismiss: () => {},
          t: (key: string) => key,
          sessionId,
        })),
      ),
    )
  }
  await act(async () => { render() })
  return {
    text: () => container.textContent ?? '',
    rerender: async () => { await act(async () => { render() }) },
    unmount: async () => { await act(async () => { root.unmount() }) },
  }
}

describe('BtwCard rendering', () => {
  it('re-renders when the shared source publishes a new answer', async () => {
    let sink: ((change: unknown) => void) | undefined
    const registry = new BtwCardRegistry(
      (_sessionId, onChange): BtwCardStream => {
        sink = change => { onChange(change as never) }
        return { dispose: () => {} }
      },
      async () => {},
    )
    const store = registry.observable()
    const card = await mount(store as never, [SESSION])

    // Nothing asked yet: the entry renders no card.
    expect(card.text()).toBe('')

    await act(async () => {
      registry.observe(SESSION, 'btw', { kind: 'success', text: startedText('fork-1') })
    })
    expect(card.text()).toContain('status.watching')

    // The answer arriving through the stream must reach the DOM without any
    // external re-render trigger.
    await act(async () => {
      sink?.({
        type: 'append',
        entry: {
          type: 'event',
          event: {
            type: 'assistant/message',
            data: { message: { role: 'assistant', content: [{ type: 'text', text: 'the answer' }] } },
          },
        },
      })
    })
    expect(card.text()).toContain('the answer')

    await act(async () => {
      sink?.({ type: 'append', entry: { type: 'event', event: { type: 'turn/end', data: { turn: 1 } } } })
    })
    expect(card.text()).toContain('status.answered')

    await card.unmount()
  })

  it('renders a card only in the Session that asked', async () => {
    const registry = new BtwCardRegistry(
      (): BtwCardStream => ({ dispose: () => {} }),
      async () => {},
    )
    const card = await mount(registry.observable() as never, ['asker', 'other'])
    await act(async () => {
      registry.observe('asker', 'btw', { kind: 'success', text: startedText('fork-9') })
    })
    const sections = document.querySelectorAll('section')
    expect(sections).toHaveLength(1)
    expect(card.text()).toContain('fork-9'.length > 0 ? 'status.watching' : '')
    await card.unmount()
  })
})
