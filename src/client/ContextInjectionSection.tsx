/**
 * Context-injection settings section: the Harness-compat page.
 *
 * It holds one switch per part of the compatibility surface — skills, memory
 * loading and writing, and scoped rules — and lists under each what it does, so
 * the page states the compatibility surface itself instead of pointing at the
 * README. Each switch reports its own write: saving, saved, or failed with a
 * retry, next to the switch it belongs to.
 *
 * @module @guowenzhang/dsh-claude-compat/client/ContextInjectionSection
 */

import type { ReactNode } from 'react'
import { Button, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextInjectionSectionFace, InjectionSwitch } from './settings-controller.ts'
import type { ContextInjectionSectionKey } from './locales.ts'
import css from './ContextInjectionSection.module.css'

/** Full component props. */
export type ContextInjectionSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.contextInjection'>
  & InjectFace<ContextInjectionSectionFace>

/** One entry of a switch's loading list. */
export interface CompatEntry {
  /** Dictionary key of the entry label. */
  title: ContextInjectionSectionKey
  /** Dictionary key of the entry's paths and load timing. */
  detail: ContextInjectionSectionKey
}

/** One compatibility switch and the list shown under it. */
export interface CompatSwitch {
  /** Settings field this switch writes. */
  name: InjectionSwitch
  /** Dictionary key of the switch label. */
  label: ContextInjectionSectionKey
  /** Dictionary key of the one-line description beside the switch. */
  desc: ContextInjectionSectionKey
  /** What this switch loads, in the order the Host resolves it. */
  entries: readonly CompatEntry[]
}

/** The switches, in the order the page presents them. */
export const COMPAT_SWITCHES: readonly CompatSwitch[] = [
  {
    name: 'skills',
    label: 'skills',
    desc: 'skills.desc',
    entries: [{ title: 'skills.entry', detail: 'skills.entry.detail' }],
  },
  {
    name: 'memory',
    label: 'memory',
    desc: 'memory.desc',
    entries: [
      { title: 'memory.files', detail: 'memory.files.detail' },
      { title: 'memory.auto', detail: 'memory.auto.detail' },
      { title: 'memory.nested', detail: 'memory.nested.detail' },
      { title: 'memory.imports', detail: 'memory.imports.detail' },
    ],
  },
  {
    name: 'memoryWrite',
    label: 'memoryWrite',
    desc: 'memoryWrite.desc',
    entries: [{ title: 'memoryWrite.files', detail: 'memoryWrite.files.detail' }],
  },
  {
    name: 'rules',
    label: 'rules',
    desc: 'rules.desc',
    entries: [{ title: 'rules.entry', detail: 'rules.entry.detail' }],
  },
]

/** The settings section body. */
export function ContextInjectionSection(props: ContextInjectionSectionProps): ReactNode {
  const { useContextInjection, t, toggle } = props
  const state = useContextInjection(snapshot => snapshot)
  const disabled = !state.available || !state.writable

  return (
    <div className={css.section}>
      <div className={css.panel}>
        <p className={css.intro}>{t('intro')}</p>
        <span className={css.switchSectionLabel}>{t('switchSection')}</span>
        <div>
          {COMPAT_SWITCHES.map(entry => {
            const save = state.saves[entry.name]
            // Writing memory is only reachable while memory loading is on; the
            // same condition closes the switch and its retry.
            const locked = entry.name === 'memoryWrite' && !state.memory
            return (
              <div key={entry.name} className={css.switchRow}>
                <div className={css.switchHead}>
                  <span className={css.switchText}>
                    <span className={css.switchLabel}>{t(entry.label)}</span>
                    <span className={css.switchDesc}>{t(entry.desc)}</span>
                  </span>
                  <Switch
                    checked={entry.name === 'memoryWrite' ? state.memory && state.memoryWrite : state[entry.name]}
                    onChange={() => { void toggle(entry.name) }}
                    label={t(entry.label)}
                    disabled={disabled || locked || save.phase === 'saving'}
                    title={disabled ? t('unavailable') : locked ? t('memoryWrite.requiresMemory') : undefined}
                  />
                </div>
                {/* The write's own state, beside the switch that produced it. */}
                {save.phase === 'saving' ? <p className={css.saveNote} role="status">{t('saving')}</p> : null}
                {save.phase === 'saved' ? <p className={css.saveNote} role="status">{t('saved')}</p> : null}
                {save.phase === 'failed' ? (
                  <div className={css.saveFailure}>
                    <p role="alert">{`${t('saveFailed')} ${save.message}`}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled || locked}
                      onClick={() => { void toggle(entry.name) }}
                    >
                      {t('retry')}
                    </Button>
                  </div>
                ) : null}
                <ul className={css.compatList}>
                  {entry.entries.map(item => (
                    <li key={item.title} className={css.compatItem}>
                      <span className={css.compatTitle}>{t(item.title)}</span>
                      <span className={css.compatDetail}>{t(item.detail)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        {!state.available ? (
          <>
            <p className={css.unavailable}>{t('unavailable')}</p>
            <p className={css.unavailableHint}>{t('unavailableHint')}</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
