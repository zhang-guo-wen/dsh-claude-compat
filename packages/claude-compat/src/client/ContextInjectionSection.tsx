/**
 * Context-injection settings section: the Harness-compat page with two tabs.
 *
 * Tab "提示词管理" describes the default skill and CLAUDE.md / AGENTS.md loading
 * rules, edits a system-level prompt persisted to the `context-injection`
 * namespace (which the Host injects as a real system-prompt section), and holds
 * the two Claude/Codex rule-injection master toggles. Tab "MCP 管理" lists the
 * MCP servers the Host has configured — global plane plus every agent-preset
 * composition, surfaced without deduplication and tagged with its config scope.
 * @module @deepseek-ai/dsh-client-ui-context-injection/ContextInjectionSection
 */

import { useEffect, useState, type ReactNode } from 'react'
import { StateDot, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { mcpDescriptionKey, type ContextInjectionSectionFace, type McpPhase, type McpServer } from './settings-controller.ts'
import type { ContextInjectionSectionKey } from './locales.ts'
import css from './ContextInjectionSection.module.css'

/** Full component props. */
export type ContextInjectionSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.contextInjection'>
  & InjectFace<ContextInjectionSectionFace>

/** Localized `t` bound to this section's dictionary namespace. */
type Translate = ContextInjectionSectionProps['t']

/** One tab id inside the section. */
type TabId = 'prompt' | 'mcp'

/** MCP load view state. */
type McpView =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly servers: readonly McpServer[] }

/** Non-empty fiber-phase → localized status key. */
const PHASE_LABEL = {
  pending: 'mcp.status.pending',
  loading: 'mcp.status.loading',
  active: 'mcp.status.active',
  failed: 'mcp.status.failed',
  unloading: 'mcp.status.unloading',
} as const satisfies Record<NonNullable<McpPhase>, ContextInjectionSectionKey>

/** Non-empty fiber-phase → state-dot semantic. */
const PHASE_DOT = {
  pending: 'idle',
  loading: 'ongoing',
  active: 'done',
  failed: 'error',
  unloading: 'ongoing',
} as const satisfies Record<NonNullable<McpPhase>, StateDotState>

/** Resolve one MCP row's displayed status label and dot. */
function statusOf(server: McpServer, t: Translate): { label: string; dot: StateDotState } {
  if (server.enabled === false) return { label: t('mcp.status.disabled'), dot: 'idle' }
  if (server.enabled === 'conditional') return { label: t('mcp.status.conditional'), dot: 'warning' }
  if (server.fiberPhase === null) return { label: t('mcp.status.configured'), dot: 'idle' }
  return { label: t(PHASE_LABEL[server.fiberPhase]), dot: PHASE_DOT[server.fiberPhase] }
}

/** One rendered MCP server row: name, plugin-owned description, scope and status. */
function McpRow({ server, description, onEditDescription, t }: {
  readonly server: McpServer
  readonly description: string
  readonly onEditDescription: (value: string) => void
  readonly t: Translate
}): ReactNode {
  const scope = server.scope === 'global'
    ? t('mcp.scopeGlobal')
    : `${t('mcp.scopePreset')} · ${server.presetId ?? ''}`
  const status = statusOf(server, t)
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? description
  return (
    <div className={css.mcpRow} data-mcp-scope={server.scope} data-mcp-name={server.serverName}>
      <div className={css.mcpMain}>
        <span className={css.mcpName}>{server.serverName}</span>
        <input
          className={css.mcpDesc}
          value={value}
          placeholder={t('mcp.descriptionPlaceholder')}
          aria-label={t('mcp.descriptionLabel')}
          onChange={(event) => { setDraft(event.currentTarget.value) }}
          onBlur={() => { onEditDescription(value); setDraft(null) }}
        />
      </div>
      <div className={css.mcpRight}>
        <span className={css.badge}>{scope}</span>
        <span className={css.status}>
          <StateDot state={status.dot} />
          {status.label}
        </span>
      </div>
    </div>
  )
}

/** The settings section body. */
export function ContextInjectionSection(props: ContextInjectionSectionProps): ReactNode {
  const { useContextInjection, t, toggle, updateSystemPrompt, updateMcpDescription, mcps } = props
  const state = useContextInjection(snapshot => snapshot)
  const [activeTab, setActiveTab] = useState<TabId>('prompt')
  const [promptDraft, setPromptDraft] = useState<string | null>(null)
  const [mcpView, setMcpView] = useState<McpView>({ status: 'loading' })
  const [mcpRequest, setMcpRequest] = useState(0)
  const disabled = !state.available || !state.writable
  const promptValue = promptDraft ?? state.systemPrompt

  useEffect(() => {
    let current = true
    setMcpView({ status: 'loading' })
    void Promise.resolve().then(mcps).then(
      (servers) => { if (current) setMcpView({ status: 'ready', servers }) },
      () => { if (current) setMcpView({ status: 'error' }) },
    )
    return () => { current = false }
  }, [mcps, mcpRequest])

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
      <div className={css.tabs} role="tablist" aria-label={t('nav')}>
        <button
          type="button"
          role="tab"
          className={css.tab}
          aria-selected={activeTab === 'prompt'}
          aria-controls="context-injection-prompt"
          onClick={() => { setActiveTab('prompt') }}
        >
          {t('tab.prompt')}
        </button>
        <button
          type="button"
          role="tab"
          className={css.tab}
          aria-selected={activeTab === 'mcp'}
          aria-controls="context-injection-mcp"
          onClick={() => { setActiveTab('mcp') }}
        >
          {t('tab.mcp')}
        </button>
      </div>

      {activeTab === 'prompt' ? (
        <div className={css.panel} id="context-injection-prompt" role="tabpanel">
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
      ) : (
        <div className={css.panel} id="context-injection-mcp" role="tabpanel">
          <p className={css.mcpSub}>{t('mcp.subtitle')}</p>
          {mcpView.status === 'loading' ? <p className={css.mcpStatus}>{t('mcp.loading')}</p> : null}
          {mcpView.status === 'error' ? (
            <div className={css.mcpFailure}>
              <p role="alert">{t('mcp.error')}</p>
              <button type="button" className={css.mcpRetry} onClick={() => { setMcpRequest(value => value + 1) }}>
                {t('mcp.retry')}
              </button>
            </div>
          ) : null}
          {mcpView.status === 'ready' && mcpView.servers.length === 0 ? (
            <p className={css.empty}>{t('mcp.empty')}</p>
          ) : null}
          {mcpView.status === 'ready' && mcpView.servers.length > 0 ? (
            <div className={css.mcpList}>
              {mcpView.servers.map((server) => {
                const key = mcpDescriptionKey(server)
                return (
                  <McpRow
                    key={key}
                    server={server}
                    description={server.description ?? state.mcpDescriptions[key] ?? ''}
                    onEditDescription={(value) => { updateMcpDescription(key, value) }}
                    t={t}
                  />
                )
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
