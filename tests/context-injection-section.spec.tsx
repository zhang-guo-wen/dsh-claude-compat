// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  COMPAT_SWITCHES,
  ContextInjectionSection,
  type ContextInjectionSectionProps,
} from '../src/client/ContextInjectionSection.tsx'
import {
  en,
  MAX_FOOTNOTE_LENGTH,
  MAX_HINT_LENGTH,
  MAX_LINE_LENGTH,
  zh,
  type ContextInjectionSectionKey,
} from '../src/client/locales.ts'
import {
  ContextInjectionController,
  type ContextInjectionFlags,
  type ContextInjectionSectionState,
  type InjectionSwitch,
  type SwitchSave,
} from '../src/client/settings-controller.ts'

/** React only runs `act`-wrapped work when the environment says it is testing. */
const reactTestEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true

/** The resting write state every switch starts in. */
const IDLE: SwitchSave = { phase: 'idle' }
const IDLE_SAVES: Readonly<Record<InjectionSwitch, SwitchSave>> = {
  skills: IDLE,
  memory: IDLE,
  autoMemory: IDLE,
  memoryWrite: IDLE,
  rules: IDLE,
}

const READY: ContextInjectionSectionState = {
  available: true,
  writable: true,
  skills: true,
  memory: true,
  autoMemory: true,
  memoryWrite: false,
  rules: true,
  saves: IDLE_SAVES,
}

/** The section's props for a locale and a fixed settings snapshot. */
function propsOf(
  locale: 'zh' | 'en',
  state: Partial<ContextInjectionSectionState> = {},
): ContextInjectionSectionProps {
  const dictionary = locale === 'zh' ? zh : en
  const snapshot: ContextInjectionSectionState = { ...READY, ...state }
  return {
    t: (key: ContextInjectionSectionKey) => dictionary[key],
    useContextInjection: (selector: (value: ContextInjectionSectionState) => unknown) => selector(snapshot),
    toggle: () => Promise.resolve(),
  } as unknown as ContextInjectionSectionProps
}

/** Render the section with a real dictionary and a fixed settings snapshot. */
function render(locale: 'zh' | 'en', state: Partial<ContextInjectionSectionState> = {}): string {
  return renderToStaticMarkup(<ContextInjectionSection {...propsOf(locale, state)} />)
}

/** React escapes the text it renders, so compare against escaped copy. */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** A settings-form stub; every write resolves unless the test says otherwise. */
function scopeOf(
  value: ContextInjectionFlags,
  write: (operation: unknown) => Promise<unknown> = () => Promise.resolve(true),
): ConfigForm<ContextInjectionFlags> {
  return {
    getSnapshot: () => ({ status: 'ready', writable: true, value }),
    subscribe: () => () => {},
    set: (field: string, next: boolean) => write({ field, next }),
    mutate: (ops: unknown[]) => write(ops),
  } as unknown as ConfigForm<ContextInjectionFlags>
}

describe('context-injection section switches', () => {
  it('gives each part of the surface its own switch', () => {
    const html = render('zh')
    expect(html.match(/role="switch"/g)).toHaveLength(COMPAT_SWITCHES.length)
    expect(COMPAT_SWITCHES.map(entry => entry.name))
      .toEqual(['skills', 'memory', 'autoMemory', 'memoryWrite', 'rules'])
  })

  it('labels every switch, its state line and every load path, in both languages', () => {
    for (const locale of ['zh', 'en'] as const) {
      const dictionary = locale === 'zh' ? zh : en
      const html = render(locale)
      for (const entry of COMPAT_SWITCHES) {
        expect(html).toContain(escaped(dictionary[entry.label]))
        expect(html).toContain(escaped(dictionary[entry.on]))
        for (const item of entry.entries) {
          expect(html).toContain(escaped(dictionary[item.title]))
          expect(html).toContain(escaped(dictionary[item.hint]))
          for (const path of item.paths) expect(html).toContain(escaped(path))
        }
      }
      expect(html).toContain(escaped(dictionary.footer))
    }
  })

  it('shows the line for the state the switch is in, never both', () => {
    const on = render('zh')
    expect(on).toContain(escaped(zh['prompts.on']))
    expect(on).not.toContain(escaped(zh['prompts.off']))

    const off = render('zh', { memory: false })
    expect(off).toContain(escaped(zh['prompts.off']))
    expect(off).not.toContain(escaped(zh['prompts.on']))
    // One line per switch row: the off state replaces the on line rather than
    // stacking under it.
    expect(off).not.toContain(escaped(zh['prompts.on']))
    // Nothing on this page is hover-only: a touch device has no hover.
    expect(on).not.toContain('title="')
  })

  it('holds every line to its own ceiling and drops the intro card', () => {
    const keys = Object.keys(zh)
    expect(keys).not.toContain('intro')
    const kindOf = (key: string): number | undefined => {
      if (key.endsWith('.hint')) return MAX_HINT_LENGTH
      if (key.endsWith('.on') || key.endsWith('.off')) return MAX_LINE_LENGTH
      if (key === 'footer') return MAX_FOOTNOTE_LENGTH
      return undefined
    }
    const capped = keys.filter(key => kindOf(key) !== undefined)
    expect(capped.length).toBeGreaterThan(0)
    for (const locale of ['zh', 'en'] as const) {
      const dictionary = locale === 'zh' ? zh : en
      for (const key of capped) {
        expect(dictionary[key].length, `${locale}:${key}`).toBeLessThanOrEqual(kindOf(key)!)
      }
    }
    // One footer paragraph, and no other prose in the resting state.
    const html = render('zh')
    expect(html.match(/<p/g)).toHaveLength(1)
    expect(html).toContain(escaped(zh.footer))
  })

  it('reflects each switch independently', () => {
    const html = render('zh', { memory: false })
    expect(html.match(/aria-checked="false"/g)).toHaveLength(2)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(3)
  })

  it('keeps writing operable while prompt loading is off', () => {
    const html = render('zh', { memory: false, memoryWrite: true })
    expect(html.match(/disabled=""/g) ?? []).toHaveLength(0)
  })

  it('reports each switch write in the row that produced it', () => {
    const saving = render('zh', { saves: { ...IDLE_SAVES, skills: { phase: 'saving' } } })
    expect(saving).toContain(escaped(zh.saving))
    // A write in flight closes its own switch, so a second click cannot race it.
    expect(saving.match(/disabled=""/g)?.length).toBe(1)

    const failed = render('zh', { saves: { ...IDLE_SAVES, memory: { phase: 'failed', message: 'read-only document' } } })
    expect(failed).toContain(escaped(zh.saveFailed))
    expect(failed).toContain('read-only document')
    expect(failed).toContain(escaped(zh.retry))
    // The switch itself stays on the committed value, so it is still operable.
    expect(failed.match(/disabled=""/g)?.length ?? 0).toBe(0)
  })

  it('hands a landed flip to the host banner, not to the row', async () => {
    // The banner is a render effect around the host `Toast`, so it only exists
    // once the section is mounted; a static render cannot show it.
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () => {
        root.render(<ContextInjectionSection
          {...propsOf('zh', { saves: { ...IDLE_SAVES, rules: { phase: 'saved' } } })}
        />)
      })
      expect(document.body.textContent).toContain(`${zh.saved} · ${zh.rules}`)
      expect(container.textContent).not.toContain(zh.saved)
    } finally {
      await act(async () => { root.unmount() })
      container.remove()
    }
  })

  it('explains an unavailable deployment and what to check', () => {
    const html = render('zh', { available: false })
    expect(html).toContain(escaped(zh.unavailable))
    expect(html).toContain(escaped(zh.unavailableHint))
    expect(html).toContain('disabled=""')
    // The retired Codex switch, system-prompt box, and `/btw` card are gone.
    expect(html).not.toContain('textarea')
    expect(html).not.toContain(escaped('Codex'))
    expect(html).not.toContain(escaped('/btw'))
  })

  it('keeps both dictionaries in step', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
    expect(Object.values(en).every(value => value.length > 0)).toBe(true)
  })
})

describe('context-injection controller writes', () => {
  it('writes only the switch that was flipped', async () => {
    const writes: unknown[] = []
    const value: ContextInjectionFlags = { skills: true, memory: true, autoMemory: true, memoryWrite: true, rules: true }
    const scope = scopeOf(value, operation => { writes.push(operation); return Promise.resolve(true) })
    const controller = new ContextInjectionController(scope)
    const face = controller.inject()
    await face.toggle('memory')
    await face.toggle('autoMemory')
    expect(writes).toEqual([
      { field: 'memory', next: false },
      { field: 'autoMemory', next: false },
    ])
    controller.dispose()
  })

  it('publishes writing independently of loading', () => {
    const value: ContextInjectionFlags = { skills: true, memory: false, autoMemory: false, memoryWrite: true, rules: true }
    const controller = new ContextInjectionController(scopeOf(value))
    expect(controller.inject().hooks.contextInjection.getSnapshot().memoryWrite).toBe(true)
    controller.dispose()
  })

  it('publishes saving then saved around a committed write', async () => {
    const value: ContextInjectionFlags = { skills: true, memory: true, autoMemory: true, memoryWrite: false, rules: true }
    const controller = new ContextInjectionController(scopeOf(value))
    const face = controller.inject()
    const phases: string[] = []
    face.hooks.contextInjection.subscribe(() => {
      phases.push(face.hooks.contextInjection.getSnapshot().saves.skills.phase)
    })
    await face.toggle('skills')
    expect(phases).toContain('saving')
    expect(face.hooks.contextInjection.getSnapshot().saves.skills.phase).toBe('saved')
    controller.dispose()
  })

  it('reports a refused write and keeps the committed value', async () => {
    const value: ContextInjectionFlags = { skills: true, memory: true, autoMemory: true, memoryWrite: false, rules: true }
    const scope = scopeOf(value, () => Promise.reject(new Error('read-only document')))
    const controller = new ContextInjectionController(scope)
    const face = controller.inject()
    await face.toggle('skills')
    expect(face.hooks.contextInjection.getSnapshot().saves.skills)
      .toEqual({ phase: 'failed', message: 'read-only document' })
    // A failure never moves the switch: the projection still reads the Host value.
    expect(face.hooks.contextInjection.getSnapshot().skills).toBe(true)
    controller.dispose()
  })

  it('drops a success note instead of leaving it on the row', async () => {
    vi.useFakeTimers()
    const value: ContextInjectionFlags = { skills: true, memory: true, autoMemory: true, memoryWrite: false, rules: true }
    const controller = new ContextInjectionController(scopeOf(value))
    const face = controller.inject()
    try {
      await face.toggle('rules')
      expect(face.hooks.contextInjection.getSnapshot().saves.rules.phase).toBe('saved')
      vi.advanceTimersByTime(2_000)
      expect(face.hooks.contextInjection.getSnapshot().saves.rules.phase).toBe('idle')
    } finally {
      controller.dispose()
      vi.useRealTimers()
    }
  })
})
