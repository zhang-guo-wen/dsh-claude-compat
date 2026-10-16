import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  COMPAT_SWITCHES,
  ContextInjectionSection,
  type ContextInjectionSectionProps,
} from '../src/client/ContextInjectionSection.tsx'
import { en, zh, type ContextInjectionSectionKey } from '../src/client/locales.ts'
import {
  ContextInjectionController,
  type ContextInjectionFlags,
  type ContextInjectionSectionState,
  type InjectionSwitch,
  type SwitchSave,
} from '../src/client/settings-controller.ts'

/** The resting write state every switch starts in. */
const IDLE: SwitchSave = { phase: 'idle' }
const IDLE_SAVES: Readonly<Record<InjectionSwitch, SwitchSave>> = {
  skills: IDLE,
  memory: IDLE,
  memoryWrite: IDLE,
  rules: IDLE,
}

const READY: ContextInjectionSectionState = {
  available: true,
  writable: true,
  skills: true,
  memory: true,
  memoryWrite: false,
  rules: true,
  saves: IDLE_SAVES,
}

/** Render the section with a real dictionary and a fixed settings snapshot. */
function render(locale: 'zh' | 'en', state: Partial<ContextInjectionSectionState> = {}): string {
  const dictionary = locale === 'zh' ? zh : en
  const snapshot: ContextInjectionSectionState = { ...READY, ...state }
  const props = {
    t: (key: ContextInjectionSectionKey) => dictionary[key],
    useContextInjection: (selector: (value: ContextInjectionSectionState) => unknown) => selector(snapshot),
    toggle: () => Promise.resolve(),
  } as unknown as ContextInjectionSectionProps
  return renderToStaticMarkup(<ContextInjectionSection {...props} />)
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
    expect(COMPAT_SWITCHES.map(entry => entry.name)).toEqual(['skills', 'memory', 'memoryWrite', 'rules'])
  })

  it('names what each switch loads, in both languages', () => {
    for (const locale of ['zh', 'en'] as const) {
      const dictionary = locale === 'zh' ? zh : en
      const html = render(locale)
      for (const entry of COMPAT_SWITCHES) {
        expect(html).toContain(escaped(dictionary[entry.label]))
        expect(html).toContain(escaped(dictionary[entry.desc]))
        for (const item of entry.entries) {
          expect(html).toContain(escaped(dictionary[item.title]))
          expect(html).toContain(escaped(dictionary[item.detail]))
        }
      }
    }
  })

  it('states the load timing of the memory entries', () => {
    const html = render('zh')
    // Each entry's copy carries its own timing, so the page answers "when does
    // this reach the model?" without the README.
    expect(html).toContain('会话开始时注入一次')
    expect(html).toContain('读到某个目录下的文件后')
    expect(html).toContain('最多 4 跳')
    expect(html).toContain('只读')
  })

  it('reflects each switch independently', () => {
    expect(render('zh', { memory: false })).toContain('aria-checked="false"')
    const html = render('zh', { memory: false })
    expect(html.match(/aria-checked="false"/g)).toHaveLength(2)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2)
  })

  it('disables writing until memory loading is on', () => {
    const html = render('zh', { memory: false, memoryWrite: true })
    expect(html).toContain(escaped(zh['memoryWrite.requiresMemory']))
    expect(html.match(/disabled=""/g)?.length).toBe(1)
  })

  it('reports each switch write in the row that produced it', () => {
    const saving = render('zh', { saves: { ...IDLE_SAVES, skills: { phase: 'saving' } } })
    expect(saving).toContain(escaped(zh.saving))
    // A write in flight closes its own switch, so a second click cannot race it.
    expect(saving.match(/disabled=""/g)?.length).toBe(1)

    expect(render('zh', { saves: { ...IDLE_SAVES, rules: { phase: 'saved' } } })).toContain(escaped(zh.saved))

    const failed = render('zh', { saves: { ...IDLE_SAVES, memory: { phase: 'failed', message: 'read-only document' } } })
    expect(failed).toContain(escaped(zh.saveFailed))
    expect(failed).toContain('read-only document')
    expect(failed).toContain(escaped(zh.retry))
    // The switch itself stays on the committed value, so it is still operable.
    expect(failed.match(/disabled=""/g)?.length ?? 0).toBe(0)
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
  it('clears writing atomically when memory loading is turned off', async () => {
    const writes: unknown[] = []
    const value: ContextInjectionFlags = { skills: true, memory: true, memoryWrite: true, rules: true }
    const scope = scopeOf(value, operation => { writes.push(operation); return Promise.resolve(true) })
    const controller = new ContextInjectionController(scope)
    const face = controller.inject()
    await face.toggle('memory')
    expect(writes).toEqual([[
      { op: 'set', path: ['memoryWrite'], value: false },
      { op: 'set', path: ['memory'], value: false },
    ]])
    writes.length = 0
    value.memory = false
    value.memoryWrite = false
    await face.toggle('memoryWrite')
    expect(writes).toEqual([])
    controller.dispose()
  })

  it('publishes saving then saved around a committed write', async () => {
    const value: ContextInjectionFlags = { skills: true, memory: true, memoryWrite: false, rules: true }
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
    const value: ContextInjectionFlags = { skills: true, memory: true, memoryWrite: false, rules: true }
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
    const value: ContextInjectionFlags = { skills: true, memory: true, memoryWrite: false, rules: true }
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
