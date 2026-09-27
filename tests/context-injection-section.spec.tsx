import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  COMPAT_SWITCHES,
  ContextInjectionSection,
  type ContextInjectionSectionProps,
} from '../src/client/ContextInjectionSection.tsx'
import { en, zh, type ContextInjectionSectionKey } from '../src/client/locales.ts'
import type { ContextInjectionSectionState } from '../src/client/settings-controller.ts'

const READY: ContextInjectionSectionState = {
  available: true,
  writable: true,
  skills: true,
  memory: true,
  rules: true,
}

/** Render the section with a real dictionary and a fixed settings snapshot. */
function render(locale: 'zh' | 'en', state: Partial<ContextInjectionSectionState> = {}): string {
  const dictionary = locale === 'zh' ? zh : en
  const snapshot: ContextInjectionSectionState = { ...READY, ...state }
  const props = {
    t: (key: ContextInjectionSectionKey) => dictionary[key],
    useContextInjection: (selector: (value: ContextInjectionSectionState) => unknown) => selector(snapshot),
    toggle: () => {},
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

describe('context-injection section switches', () => {
  it('gives each part of the surface its own switch', () => {
    const html = render('zh')
    expect(html.match(/role="switch"/g)).toHaveLength(COMPAT_SWITCHES.length)
    expect(COMPAT_SWITCHES.map(entry => entry.name)).toEqual(['skills', 'memory', 'rules'])
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
    expect(html.match(/aria-checked="false"/g)).toHaveLength(1)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2)
  })

  it('renders the unavailable notice without any switch', () => {
    const html = render('zh', { available: false })
    expect(html).toContain(escaped(zh.unavailable))
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
