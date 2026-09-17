/**
 * Context-injection settings section: the Harness-compat page for prompt
 * management.
 *
 * It describes the default skill and CLAUDE.md / AGENTS.md loading rules, edits
 * a system-level prompt persisted to the `context-injection` namespace (which
 * the Host injects as a real system-prompt section), and holds the two
 * Claude/Codex rule-injection master toggles.
 *
 * MCP server management is the separate `settings.mcpManager` section owned by
 * the `@zhang-guo-wen/dsh-mcp-manager` plugin, which also owns the loading mode
 * and the per-row tool filters.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/client/ContextInjectionSection
 */

import { useState, type ReactNode } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextInjectionSectionFace } from './settings-controller.ts'
import type { ContextInjectionSectionKey } from './locales.ts'
import css from './ContextInjectionSection.module.css'

/** Full component props. */
export type ContextInjectionSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.contextInjection'>
  & InjectFace<ContextInjectionSectionFace>

/** The settings section body. */
export function ContextInjectionSection(props: ContextInjectionSectionProps): ReactNode {
  const { useContextInjection, t, toggle, updateSystemPrompt } = props
  const state = useContextInjection(snapshot => snapshot)
  const [promptDraft, setPromptDraft] = useState<string | null>(null)
  const disabled = !state.available || !state.writable
  const promptValue = promptDraft ?? state.systemPrompt

  const commitPrompt = (): void => {
    if (promptDraft === null) return
    updateSystemPrompt(promptDraft)
  }

  const switchRow = (
    key: 'claude' | 'codex',
    descKey: ContextInjectionSectionKey,
    filesKey: ContextInjectionSectionKey,
  ): ReactNode => (
    <div className={css.switchRow}>
      <span className={css.switchText}>
        <span className={css.switchLabel}>{t(key)}</span>
        <span className={css.switchDesc}>{t(descKey)}</span>
        <span className={css.switchFiles}>{t(filesKey)}</span>
      </span>
      <Switch
        checked={key === 'claude' ? state.claude : state.codex}
        onChange={() => { toggle(key) }}
        label={t(key)}
        disabled={disabled}
        title={disabled ? t('unavailable') : undefined}
      />
    </div>
  )

  return (
    <div className={css.section}>
      <div className={css.panel}>
        <p className={css.intro}>{t('prompt.intro')}</p>
        <div className={css.field}>
          <span className={css.fieldLabel}>{t('systemPrompt.label')}</span>
          <span className={css.fieldHint}>{t('systemPrompt.hint')}</span>
          <textarea
            className={css.promptArea}
            value={promptValue}
            placeholder={t('systemPrompt.placeholder')}
            disabled={disabled}
            onChange={(event) => { setPromptDraft(event.currentTarget.value) }}
            onBlur={commitPrompt}
          />
        </div>
        {!state.available ? <p className={css.unavailable}>{t('unavailable')}</p> : null}
        <span className={css.switchSectionLabel}>{t('switchSection')}</span>
        <div>
          {switchRow('claude', 'claude.desc', 'claude.files')}
          {switchRow('codex', 'codex.desc', 'codex.files')}
        </div>
      </div>
    </div>
  )
}
