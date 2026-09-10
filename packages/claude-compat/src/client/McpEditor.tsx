import { useEffect, useState, type ReactNode } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AddMcpRequest,
  DescribeMcpRequest,
  DescribeMcpResult,
  EditMcpRequest,
  McpSpec,
} from '../types.ts'
import type { ContextInjectionSectionKey } from './locales.ts'
import type { McpPresetOption, McpServer } from './settings-controller.ts'
import css from './ContextInjectionSection.module.css'

/** Localized `t` bound to this section's dictionary namespace. */
type Translate = (key: ContextInjectionSectionKey) => string

/** Whether the editor is creating a row or replacing one. */
export type McpEditorMode = 'add' | 'edit'

/** Request emitted by the MCP editor after JSON parsing and validation. */
export type McpEditorRequest = AddMcpRequest | EditMcpRequest

interface McpEditorProps {
  readonly open: boolean
  readonly mode: McpEditorMode
  readonly server: McpServer | undefined
  readonly disabled: boolean
  readonly busy: boolean
  readonly error: string | null
  readonly describeMcp: (request: DescribeMcpRequest) => Promise<DescribeMcpResult>
  readonly presets: () => Promise<readonly McpPresetOption[]>
  readonly descriptionInitial: string
  readonly onUpdateDescription: (key: string, value: string) => void
  readonly t: Translate
  readonly onClose: () => void
  readonly onSubmit: (request: McpEditorRequest) => void
}

type AnyRecord = Record<string, unknown>

/** Plugin-owned description key for one row (`global:<name>` or `preset:<id>:<name>`). */
function descriptionKey(scope: 'global' | 'preset', agentPreset: string, serverName: string): string {
  return scope === 'preset' ? `preset:${agentPreset}:${serverName}` : `global:${serverName}`
}

/** Flatten a spec into a Claude-shaped object (spec fields at the top level). */
function flattenSpec(spec: McpSpec): AnyRecord {
  if (spec.type === 'stdio') {
    return {
      type: 'stdio',
      command: spec.command,
      ...(spec.args === undefined ? {} : { args: spec.args }),
      ...(spec.env === undefined ? {} : { env: spec.env }),
      ...(spec.cwd === undefined ? {} : { cwd: spec.cwd }),
    }
  }
  return {
    type: spec.type,
    url: spec.url,
    ...(spec.headers === undefined ? {} : { headers: spec.headers }),
  }
}

/** The connection-spec JSON prefilled in the box (no scope/title — those are fields). */
function specJson(describe: DescribeMcpResult | undefined): string {
  const spec = describe?.spec ?? { type: 'stdio', command: '', args: [], env: {} }
  return JSON.stringify(flattenSpec(spec), null, 2)
}

/** Parse only the connection spec from the JSON box. */
function parseSpec(text: string, invalid: string): McpSpec {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error(invalid)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(invalid)
  const candidate = value as AnyRecord
  const type = candidate.type
  if (type === 'stdio') {
    const command = candidate.command
    if (typeof command !== 'string' || command.trim() === '') throw new Error(invalid)
    const args = Array.isArray(candidate.args) ? candidate.args.map(String) : undefined
    const env = candidate.env !== null && typeof candidate.env === 'object' && !Array.isArray(candidate.env)
      ? Object.fromEntries(Object.entries(candidate.env as AnyRecord).map(([k, v]) => [k, String(v)]))
      : undefined
    const cwd = typeof candidate.cwd === 'string' ? candidate.cwd : undefined
    return {
      type: 'stdio',
      command,
      ...(args === undefined ? {} : { args }),
      ...(env === undefined ? {} : { env }),
      ...(cwd === undefined ? {} : { cwd }),
    }
  }
  if (type === 'streamable-http' || type === 'http' || type === 'sse') {
    const url = candidate.url
    if (typeof url !== 'string' || url.trim() === '') throw new Error(invalid)
    const headers = candidate.headers !== null && typeof candidate.headers === 'object' && !Array.isArray(candidate.headers)
      ? Object.fromEntries(Object.entries(candidate.headers as AnyRecord).map(([k, v]) => [k, String(v)]))
      : undefined
    return { type, url, ...(headers === undefined ? {} : { headers }) }
  }
  throw new Error(invalid)
}

/** Modal editor: one scope dropdown, title/description fields, and a JSON spec box. */
export function McpEditor({ open, mode, server, disabled, busy, error, describeMcp, presets, descriptionInitial, onUpdateDescription, t, onClose, onSubmit }: McpEditorProps): ReactNode {
  const [scopeValue, setScopeValue] = useState(server?.scope === 'preset' ? server.presetId ?? '' : '')
  const [presetOptions, setPresetOptions] = useState<readonly McpPresetOption[]>([])
  const [title, setTitle] = useState(server?.serverName ?? '')
  const [description, setDescription] = useState(descriptionInitial)
  const [json, setJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const editKey = `${server?.scope ?? ''}:${server?.presetId ?? ''}:${server?.entryId ?? ''}`

  useEffect(() => {
    if (!open) return
    let current = true
    setLocalError(null)
    setScopeValue(server?.scope === 'preset' ? server.presetId ?? '' : '')
    setTitle(server?.serverName ?? '')
    setDescription(descriptionInitial)
    void presets().then(
      (list) => { if (current) setPresetOptions(list) },
      () => { if (current) setPresetOptions([]) },
    )
    if (mode === 'edit' && server?.entryId) {
      setLoading(true)
      const target = server.scope === 'global'
        ? { scope: 'global' as const }
        : { scope: 'preset' as const, agentPreset: server.presetId ?? '' }
      void describeMcp({ target, entryId: server.entryId }).then(
        (described) => { if (current) { setJson(specJson(described)); setLoading(false) } },
        () => { if (current) { setJson(specJson(undefined)); setLoading(false) } },
      )
    } else {
      setJson(specJson(undefined))
    }
    return () => { current = false }
  }, [editKey, mode, open, server, descriptionInitial, presets, t])

  const submit = (): void => {
    try {
      const serverName = title.trim()
      if (serverName === '') throw new Error(t('mcp.form.required'))
      const spec = parseSpec(json, t('mcp.form.jsonInvalid'))
      const target = scopeValue === ''
        ? { scope: 'global' as const }
        : { scope: 'preset' as const, agentPreset: scopeValue }
      const entryId = mode === 'edit' ? server?.entryId ?? '' : undefined
      if (mode === 'edit' && entryId === '') throw new Error(t('mcp.form.required'))
      const request: McpEditorRequest = {
        target,
        serverName,
        spec,
        ...(entryId === undefined ? {} : { entryId }),
      } as McpEditorRequest
      onSubmit(request)
      if (description.trim() !== '') {
        onUpdateDescription(
          descriptionKey(scopeValue === '' ? 'global' : 'preset', scopeValue, serverName),
          description.trim(),
        )
      }
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : t('mcp.form.jsonInvalid'))
    }
  }

  const formDisabled = disabled || busy
  const titleText = mode === 'add' ? t('mcp.form.addTitle') : t('mcp.form.editTitle')
  const showsCurrentPreset = scopeValue !== '' && !presetOptions.some(option => option.id === scopeValue)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleText}
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
        <label className={css.formField}>
          <span className={css.formLabel}>{t('mcp.form.scope')}</span>
          <select
            className={css.formSelect}
            value={scopeValue}
            disabled={formDisabled || mode === 'edit'}
            aria-label={t('mcp.form.scope')}
            onChange={(event) => { setScopeValue(event.currentTarget.value); setLocalError(null) }}
          >
            <option value="">{t('mcp.scopeGlobal')}</option>
            {presetOptions.map(option => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
            {showsCurrentPreset ? <option value={scopeValue}>{scopeValue}</option> : null}
          </select>
        </label>
        <label className={css.formField}>
          <span className={css.formLabel}>{t('mcp.form.serverName')}</span>
          <Input value={title} disabled={formDisabled} aria-label={t('mcp.form.serverName')} onChange={(event) => { setTitle(event.currentTarget.value); setLocalError(null) }} />
        </label>
        <label className={css.formField}>
          <span className={css.formLabel}>{t('mcp.form.description')}</span>
          <Input value={description} disabled={formDisabled} aria-label={t('mcp.form.description')} onChange={(event) => { setDescription(event.currentTarget.value); setLocalError(null) }} />
        </label>
        <label className={css.formField}>
          <span className={css.formLabel}>{t('mcp.form.json')}</span>
          <textarea
            className={css.formJson}
            value={json}
            disabled={formDisabled}
            spellCheck={false}
            aria-label={t('mcp.form.json')}
            onChange={(event) => { setJson(event.currentTarget.value); setLocalError(null) }}
          />
        </label>
        {loading ? <p className={css.mcpStatus}>{t('mcp.loading')}</p> : null}
        {localError !== null ? <p className={css.formError} role="alert">{localError}</p> : null}
        {error !== null ? <p className={css.formError} role="alert">{error}</p> : null}
      </div>
    </Modal>
  )
}
