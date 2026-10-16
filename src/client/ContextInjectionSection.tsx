/**
 * Context-injection settings section: the Harness-compat page.
 *
 * It holds one switch per part of the compatibility surface — skills, memory
 * files, auto memory, memory writing, and scoped rules. Each switch carries its
 * label and exactly one line, and that line states the state the switch is in:
 * what it loads while it is on, and what its off state does while it is off.
 * Under it, every entry carries its label, the paths it reads as tags, and one
 * short hint. Nothing on the page is hover-only — a touch device has no hover —
 * and one footer line states what a mid-session flip can and cannot do. The copy
 * stays terse on purpose: it is there to name the switch, its paths, and the
 * traps, not to explain the feature. A flip in flight and a flip that failed
 * stay beside their own switch: the failure carries the retry that presses that
 * same switch again. A landed flip is reported in the host's floating banner
 * instead, which is where a long page cannot scroll it away, and it names the
 * switch it belongs to because the banner is no longer next to any row.
 *
 * @module @guowenzhang/dsh-claude-compat/client/ContextInjectionSection
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Switch, Tag, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
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
  /**
   * The file paths or globs this entry loads, in the order the Host resolves
   * them. Paths are not copy: they are shown to the user exactly as the Host
   * reads them, so they stay out of the dictionaries.
   */
  paths: readonly string[]
  /** Dictionary key of the entry's one-line hint. */
  hint: ContextInjectionSectionKey
}

/** One compatibility switch and the list shown under it. */
export interface CompatSwitch {
  /** Settings field this switch writes. */
  name: InjectionSwitch
  /** Dictionary key of the switch label. */
  label: ContextInjectionSectionKey
  /**
   * Dictionary key of the one line under the label: what this switch loads and
   * the budgets behind it, stated for the switch's **on** state.
   */
  on: ContextInjectionSectionKey
  /**
   * Dictionary key of the line shown while the switch is **off**. The off state
   * replaces the on line rather than sitting beside it; a switch without one
   * keeps its `on` line in both states.
   */
  off?: ContextInjectionSectionKey
  /** What this switch loads, in the order the Host resolves it. */
  entries: readonly CompatEntry[]
}

/** The switches, in the order the page presents them. */
export const COMPAT_SWITCHES: readonly CompatSwitch[] = [
  {
    name: 'skills',
    label: 'skills',
    on: 'skills.on',
    entries: [{
      title: 'skills.entry',
      paths: ['.claude/skills/**', '~/.claude/skills/**'],
      hint: 'skills.entry.hint',
    }],
  },
  {
    name: 'memory',
    label: 'prompts',
    on: 'prompts.on',
    off: 'prompts.off',
    entries: [
      {
        title: 'prompts.files',
        paths: ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md', '~/.claude/CLAUDE.md'],
        hint: 'prompts.files.hint',
      },
      {
        title: 'prompts.nested',
        paths: ['**/CLAUDE.md', '**/.claude/CLAUDE.md', '**/CLAUDE.local.md'],
        hint: 'prompts.nested.hint',
      },
      { title: 'prompts.imports', paths: ['@<path>'], hint: 'prompts.imports.hint' },
    ],
  },
  {
    name: 'autoMemory',
    label: 'autoMemory',
    on: 'autoMemory.on',
    entries: [{
      title: 'autoMemory.entry',
      paths: ['~/.claude/projects/<repo>/memory/MEMORY.md'],
      hint: 'autoMemory.entry.hint',
    }],
  },
  {
    name: 'memoryWrite',
    label: 'memoryWrite',
    on: 'memoryWrite.on',
    entries: [{
      title: 'memoryWrite.entry',
      paths: ['memory/<name>.md', 'MEMORY.md'],
      hint: 'memoryWrite.entry.hint',
    }],
  },
  {
    name: 'rules',
    label: 'rules',
    on: 'rules.on',
    entries: [{
      title: 'rules.entry',
      paths: ['.claude/rules/**', '~/.claude/rules/**'],
      hint: 'rules.entry.hint',
    }],
  },
]

/** The settings section body. */
export function ContextInjectionSection(props: ContextInjectionSectionProps): ReactNode {
  const { useContextInjection, t, toggle } = props
  const state = useContextInjection(snapshot => snapshot)
  const disabled = !state.available || !state.writable
  /**
   * The landed flip as the host's floating banner reports it. The controller
   * clears each switch's `saved` phase on its own timer, so this tracks the one
   * that arrived last and names it: the banner is not beside any row. The banner
   * owns its own lifetime and reports completion, exactly as the archive report
   * does; nothing here measures it a second time.
   */
  const [landed, setLanded] = useState<{ text: string; seq: number } | null>(null)
  const landedSeq = useRef(0)
  useEffect(() => {
    const saved = COMPAT_SWITCHES.find(entry => state.saves[entry.name].phase === 'saved')
    if (saved === undefined) return
    landedSeq.current += 1
    setLanded({ text: `${t('saved')} · ${t(saved.label)}`, seq: landedSeq.current })
  }, [state.saves, t])

  return (
    <div className={css.section}>
      <div className={css.panel}>
        <div>
          {COMPAT_SWITCHES.map(entry => {
            const save = state.saves[entry.name]
            // One line per row, and it states the state the row is in: the off
            // line replaces the on line instead of joining it.
            const line = state[entry.name] || entry.off === undefined ? entry.on : entry.off
            return (
              <div key={entry.name} className={css.switchRow}>
                <div className={css.switchHead}>
                  <span className={css.switchText}>
                    <span className={css.switchLabel}>{t(entry.label)}</span>
                    <span className={css.switchDesc}>{t(line)}</span>
                  </span>
                  <Switch
                    checked={state[entry.name]}
                    onChange={() => { void toggle(entry.name) }}
                    label={t(entry.label)}
                    disabled={disabled || save.phase === 'saving'}
                    title={disabled ? t('unavailable') : undefined}
                  />
                </div>
                {/* A flip in flight and a failed flip stay beside their switch:
                    the retry has to sit next to the control it presses again.
                    The landed flip is the banner's, so a long page cannot
                    scroll the answer away from the row that produced it. */}
                {save.phase === 'saving' ? <p className={css.saveNote} role="status">{t('saving')}</p> : null}
                {save.phase === 'failed' ? (
                  <div className={css.saveFailure}>
                    <p role="alert">{`${t('saveFailed')} ${save.message}`}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => { void toggle(entry.name) }}
                    >
                      {t('retry')}
                    </Button>
                  </div>
                ) : null}
                <ul className={css.compatList}>
                  {entry.entries.map(item => (
                    <li key={item.title} className={css.compatItem}>
                      <span className={css.compatHead}>
                        <span className={css.compatTitle}>{t(item.title)}</span>
                        <span className={css.compatPaths}>
                          {item.paths.map(path => <Tag key={path} tone="neutral">{path}</Tag>)}
                        </span>
                      </span>
                      <span className={css.compatDetail}>{t(item.hint)}</span>
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
        {/* The one line that is about the switches as a group: a mid-session
            flip cannot take back what a session already folded, and it cannot
            add a batch that session already folded, so it belongs at the end of
            the list rather than on any single row. */}
        <p className={css.footnote}>{t('footer')}</p>
      </div>
      {/* One landed flip, in the host's floating banner: it portals to the body,
          so it is readable whatever the page's own scroll position is. */}
      {landed !== null ? <Toast key={landed.seq} text={landed.text} tone="success"
        onDone={() => { setLanded(current => current?.seq === landed.seq ? null : current) }} /> : null}
    </div>
  )
}
