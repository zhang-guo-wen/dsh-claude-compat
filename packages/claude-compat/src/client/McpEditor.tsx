import { useEffect, useState, type ReactNode } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AddMcpRequest,
  EditMcpRequest,
  McpSpec,
  McpTarget,
} from '@deepseek-ai/dsh-api-remotes/client'
import type { ContextInjectionSectionKey } from './locales.ts'
import type { McpServer } from './settings-controller.ts'
import css from './ContextInjectionSection.module.css'

/** Localized `t` bound to this section's dictionary namespace. */
type Translate = (key: ContextInjectionSectionKey) => string

/** Whether the editor is creating a row or replacing one. */
export type McpEditorMode = 'add' | 'edit'

/** Request emitted by the MCP editor after form validation. */
export type McpEditorRequest = AddMcpRequest | EditMcpRequest

interface McpEditorProps {
  readonly open: boolean
  readonly mode: McpEditorMode
  readonly server: McpServer | undefined
  readonly disabled: boolean
  readonly busy: boolean
  readonly error: string | null
  readonly t: Translate
  readonly onClose: () => void
  readonly onSubmit: (request: McpEditorRequest) => void
}

type Transport = McpSpec['type']

type Draft = {
  targetScope: 'global' | 'preset'
  agentPreset: string
  entryId: string
  serverName: string
  transport: Transport
  command: string
  url: string
  args: string
  env: string
  headers: string
  cwd: string
}

function draftFor(mode: McpEditorMode, server: McpServer | undefined): Draft {
  return {
    targetScope: server?.scope ?? 'global',
    agentPreset: server?.presetId ?? '',
    entryId: mode === 'edit' ? server?.entryId ?? '' : '',
    serverName: server?.serverName ?? '',
    transport: 'stdio',
    command: '',
    url: '',
    args: '',
    env: '',
    headers: '',
    cwd: '',
  }
}

function lines(value: string): readonly string[] | undefined {
  const result = value.split('\n').map(line => line.trim()).filter(Boolean)
  return result.length === 0 ? undefined : result
}

function keyValues(value: string, invalidMessage: string): Readonly<Record<string, string>> | undefined {
  const result: Record<string, string> = {}
  for (const line of value.split('\n').map(line => line.trim()).filter(Boolean)) {
    const separator = line.indexOf('=')
    if (separator <= 0) throw new Error(invalidMessage)
    const key = line.slice(0, separator).trim()
    if (key === '') throw new Error(invalidMessage)
    result[key] = line.slice(separator + 1).trim()
  }
  return Object.keys(result).length === 0 ? undefined : result
}

function targetFor(draft: Draft): McpTarget {
  return draft.targetScope === 'global'
    ? { scope: 'global' }
    : { scope: 'preset', agentPreset: draft.agentPreset.trim() }
}

function specFor(draft: Draft, invalidMessage: string): McpSpec {
  if (draft.transport === 'stdio') {
    const command = draft.command.trim()
    if (command === '') throw new Error(invalidMessage)
    const args = lines(draft.args)
    const env = keyValues(draft.env, invalidMessage)
    return {
      type: 'stdio',
      command,
      ...(args === undefined ? {} : { args }),
      ...(env === undefined ? {} : { env }),
      ...draft.cwd.trim() === '' ? {} : { cwd: draft.cwd.trim() },
    }
  }
  const url = draft.url.trim()
  if (url === '') throw new Error(invalidMessage)
  const headers = keyValues(draft.headers, invalidMessage)
  return {
    type: draft.transport,
    url,
    ...(headers === undefined ? {} : { headers }),
  }
}

function field(label: string, input: ReactNode): ReactNode {
  return (
    <label className={css.formField}>
      <span className={css.formLabel}>{label}</span>
      {input}
    </label>
  )
}

/** Modal form for adding or replacing one MCP connection row. */
export function McpEditor({ open, mode, server, disabled, busy, error, t, onClose, onSubmit }: McpEditorProps): ReactNode {
  const [draft, setDraft] = useState<Draft>(() => draftFor(mode, server))
  const [localError, setLocalError] = useState<string | null>(null)
  const editKey = `${server?.scope ?? ''}:${server?.presetId ?? ''}:${server?.entryId ?? ''}`

  useEffect(() => {
    if (!open) return
    setDraft(draftFor(mode, server))
    setLocalError(null)
  }, [editKey, mode, open, server, t])

  const update = (key: keyof Draft, value: string): void => {
    setDraft(previous => ({ ...previous, [key]: value }))
    setLocalError(null)
  }

  const submit = (): void => {
    try {
      const serverName = draft.serverName.trim()
      if (serverName === '') throw new Error(t('mcp.form.required'))
      const target = targetFor(draft)
      if (target.scope === 'preset' && target.agentPreset === '') throw new Error(t('mcp.form.required'))
      const spec = specFor(draft, t('mcp.form.invalidKeyValue'))
      if (mode === 'edit') {
        if (draft.entryId === '') throw new Error(t('mcp.form.required'))
        onSubmit({ target, entryId: draft.entryId, serverName, spec })
      } else {
        onSubmit({
          target,
          ...draft.entryId.trim() === '' ? {} : { entryId: draft.entryId.trim() },
          serverName,
          spec,
        })
      }
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : t('mcp.form.required'))
    }
  }

  const title = mode === 'add' ? t('mcp.form.addTitle') : t('mcp.form.editTitle')
  const formDisabled = disabled || busy
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={t('mcp.form.close')}
      description={t('mcp.form.hint')}
      contentClassName={css.mcpEditorContent ?? ''}
      footer={(
        <div className={css.formActions}>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>{t('mcp.form.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={formDisabled}>
            {busy ? t('mcp.form.saving') : t('mcp.form.save')}
          </Button>
        </div>
      )}
    >
      <div className={css.mcpForm}>
        {mode === 'add' ? field(t('mcp.form.scope'), (
          <select
            className={css.formSelect}
            value={draft.targetScope}
            disabled={formDisabled}
            aria-label={t('mcp.form.scope')}
            onChange={(event) => { update('targetScope', event.currentTarget.value) }}
          >
            <option value="global">{t('mcp.scopeGlobal')}</option>
            <option value="preset">{t('mcp.scopePreset')}</option>
          </select>
        )) : null}
        {draft.targetScope === 'preset' ? field(t('mcp.form.preset'), (
          <Input value={draft.agentPreset} disabled={formDisabled || mode === 'edit'} aria-label={t('mcp.form.preset')} onChange={(event) => { update('agentPreset', event.currentTarget.value) }} />
        )) : null}
        {field(t('mcp.form.entryId'), (
          <Input value={draft.entryId} disabled={formDisabled || mode === 'edit'} placeholder={t('mcp.form.entryIdPlaceholder')} aria-label={t('mcp.form.entryId')} onChange={(event) => { update('entryId', event.currentTarget.value) }} />
        ))}
        {field(t('mcp.form.serverName'), (
          <Input value={draft.serverName} disabled={formDisabled} aria-label={t('mcp.form.serverName')} onChange={(event) => { update('serverName', event.currentTarget.value) }} />
        ))}
        {field(t('mcp.form.transport'), (
          <select
            className={css.formSelect}
            value={draft.transport}
            disabled={formDisabled}
            aria-label={t('mcp.form.transport')}
            onChange={(event) => { update('transport', event.currentTarget.value) }}
          >
            <option value="stdio">{t('mcp.form.stdio')}</option>
            <option value="streamable-http">{t('mcp.form.streamableHttp')}</option>
            <option value="http">{t('mcp.form.http')}</option>
            <option value="sse">{t('mcp.form.sse')}</option>
          </select>
        ))}
        {draft.transport === 'stdio' ? (
          <>
            {field(t('mcp.form.command'), <Input value={draft.command} disabled={formDisabled} aria-label={t('mcp.form.command')} onChange={(event) => { update('command', event.currentTarget.value) }} />)}
            {field(t('mcp.form.args'), <textarea className={css.formTextarea} value={draft.args} disabled={formDisabled} placeholder={t('mcp.form.argsPlaceholder')} aria-label={t('mcp.form.args')} onChange={(event) => { update('args', event.currentTarget.value) }} />)}
            {field(t('mcp.form.env'), <textarea className={css.formTextarea} value={draft.env} disabled={formDisabled} placeholder={t('mcp.form.keyValuePlaceholder')} aria-label={t('mcp.form.env')} onChange={(event) => { update('env', event.currentTarget.value) }} />)}
            {field(t('mcp.form.cwd'), <Input value={draft.cwd} disabled={formDisabled} aria-label={t('mcp.form.cwd')} onChange={(event) => { update('cwd', event.currentTarget.value) }} />)}
          </>
        ) : (
          <>
            {field(t('mcp.form.url'), <Input value={draft.url} disabled={formDisabled} aria-label={t('mcp.form.url')} onChange={(event) => { update('url', event.currentTarget.value) }} />)}
            {field(t('mcp.form.headers'), <textarea className={css.formTextarea} value={draft.headers} disabled={formDisabled} placeholder={t('mcp.form.keyValuePlaceholder')} aria-label={t('mcp.form.headers')} onChange={(event) => { update('headers', event.currentTarget.value) }} />)}
          </>
        )}
        {localError !== null ? <p className={css.formError} role="alert">{localError}</p> : null}
        {error !== null ? <p className={css.formError} role="alert">{error}</p> : null}
      </div>
    </Modal>
  )
}
