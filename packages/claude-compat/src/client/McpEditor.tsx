import { useEffect, useState, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AddMcpRequest,
  DescribeMcpRequest,
  DescribeMcpResult,
  EditMcpRequest,
  McpSpec,
  McpTarget,
} from '../types.ts'
import type { ContextInjectionSectionKey } from './locales.ts'
import type { McpServer } from './settings-controller.ts'
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
  readonly t: Translate
  readonly onClose: () => void
  readonly onSubmit: (request: McpEditorRequest) => void
}

type AnyRecord = Record<string, unknown>

/** Build the composition target for a row, or the default global target. */
function targetForServer(server: McpServer | undefined): McpTarget {
  if (server === undefined) return { scope: 'global' }
  return server.scope === 'global'
    ? { scope: 'global' }
    : { scope: 'preset', agentPreset: server.presetId ?? '' }
}

/**
 * Serialize the editable request to pretty-printed JSON for the editor box.
 * Edit mode prefers the Host-described spec (the inventory does not carry the
 * connection config); a describe failure falls back to the row identity.
 */
function requestJson(mode: McpEditorMode, server: McpServer | undefined, describe: DescribeMcpResult | undefined): string {
  if (mode === 'edit') {
    const request: AnyRecord = describe === undefined
      ? { target: targetForServer(server), entryId: server?.entryId ?? '', serverName: server?.serverName ?? '' }
      : { target: describe.target, entryId: describe.entryId, serverName: describe.serverName, spec: describe.spec }
    return JSON.stringify(request, null, 2)
  }
  return JSON.stringify({
    target: { scope: 'global' },
    serverName: '',
    spec: { type: 'stdio', command: '', args: [], env: {} },
  }, null, 2)
}

/** Parse and validate the editor JSON into the request consumed by the host. */
function parseRequest(text: string, mode: McpEditorMode, invalid: string): McpEditorRequest {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error(invalid)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(invalid)
  const request = value as AnyRecord

  const serverName = request.serverName
  if (typeof serverName !== 'string' || serverName.trim() === '') throw new Error(invalid)

  const target = request.target as AnyRecord | undefined
  if (target === undefined || typeof target !== 'object') throw new Error(invalid)
  const scope = target.scope
  if (scope !== 'global' && scope !== 'preset') throw new Error(invalid)
  if (scope === 'preset') {
    const agentPreset = target.agentPreset
    if (typeof agentPreset !== 'string' || agentPreset.trim() === '') throw new Error(invalid)
  }

  const spec = request.spec as AnyRecord | undefined
  if (spec === undefined || typeof spec !== 'object') throw new Error(invalid)
  const type = spec.type
  if (type === 'stdio') {
    if (typeof spec.command !== 'string' || spec.command.trim() === '') throw new Error(invalid)
  } else if (type === 'streamable-http' || type === 'http' || type === 'sse') {
    if (typeof spec.url !== 'string' || spec.url.trim() === '') throw new Error(invalid)
  } else {
    throw new Error(invalid)
  }

  if (mode === 'edit' && (typeof request.entryId !== 'string' || request.entryId.trim() === '')) {
    throw new Error(invalid)
  }

  const parsedTarget: McpTarget = scope === 'global'
    ? { scope: 'global' }
    : { scope: 'preset', agentPreset: String(target.agentPreset).trim() }
  const entryId = typeof request.entryId === 'string' ? request.entryId.trim() : undefined
  const result: McpEditorRequest = {
    target: parsedTarget,
    serverName: serverName.trim(),
    spec: spec as McpSpec,
    ...(entryId === undefined ? {} : { entryId }),
  } as McpEditorRequest
  return result
}

/** Modal editor: one JSON textbox, filled and parsed on save. */
export function McpEditor({ open, mode, server, disabled, busy, error, describeMcp, t, onClose, onSubmit }: McpEditorProps): ReactNode {
  const [json, setJson] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const editKey = `${server?.scope ?? ''}:${server?.presetId ?? ''}:${server?.entryId ?? ''}`

  useEffect(() => {
    if (!open) return
    let current = true
    setLocalError(null)
    if (mode === 'edit' && server?.entryId) {
      setLoading(true)
      const target = targetForServer(server)
      void describeMcp({ target, entryId: server.entryId }).then(
        (described) => { if (current) { setJson(requestJson(mode, server, described)); setLoading(false) } },
        () => { if (current) { setJson(requestJson(mode, server)); setLoading(false) } },
      )
    } else {
      setJson(requestJson(mode, server))
    }
    return () => { current = false }
  }, [editKey, mode, open, server, t])

  const submit = (): void => {
    try {
      onSubmit(parseRequest(json, mode, t('mcp.form.jsonInvalid')))
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : t('mcp.form.jsonInvalid'))
    }
  }

  const formDisabled = disabled || busy
  const title = mode === 'add' ? t('mcp.form.addTitle') : t('mcp.form.editTitle')
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
