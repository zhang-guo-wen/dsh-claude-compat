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

/** Serialize the editable config to pretty-printed Claude-shaped JSON. */
function requestJson(mode: McpEditorMode, server: McpServer | undefined, describe: DescribeMcpResult | undefined): string {
  if (mode === 'edit') {
    const base: AnyRecord = describe === undefined
      ? { target: targetForServer(server), entryId: server?.entryId ?? '', serverName: server?.serverName ?? '' }
      : { target: describe.target, entryId: describe.entryId, serverName: describe.serverName, ...flattenSpec(describe.spec) }
    return JSON.stringify(base, null, 2)
  }
  return JSON.stringify({
    target: { scope: 'global' },
    serverName: '',
    type: 'stdio',
    command: '',
    args: [],
    env: {},
  }, null, 2)
}

/** Derive a serverName from the command/args when the JSON omits one. */
function deriveServerName(spec: AnyRecord, fallback: string): string {
  const candidates = [
    ...(Array.isArray(spec.args) ? [...spec.args].reverse().map(String) : []),
    typeof spec.command === 'string' ? spec.command : '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (candidate.includes('@') && candidate.includes('/')) {
      const name = candidate.split('/').pop() ?? ''
      return sanitizeName(name) || fallback
    }
    const name = sanitizeName(candidate)
    if (name !== '') return name
  }
  return fallback
}

function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)
}

/** Read a spec from the object: either a nested `spec` or the flat fields. */
function specOf(value: AnyRecord, invalid: string): McpSpec | undefined {
  const candidate = (value.spec ?? value) as AnyRecord
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
  return undefined
}

function targetOf(value: AnyRecord, mode: McpEditorMode, server: McpServer | undefined, invalid: string): McpTarget {
  const raw = value.target as AnyRecord | undefined
  if (raw !== undefined && typeof raw === 'object') {
    const scope = raw.scope
    if (scope === 'global') return { scope: 'global' }
    if (scope === 'preset') {
      const agentPreset = raw.agentPreset
      if (typeof agentPreset === 'string' && agentPreset.trim() !== '') {
        return { scope: 'preset', agentPreset: agentPreset.trim() }
      }
    }
    throw new Error(invalid)
  }
  return mode === 'edit' ? targetForServer(server) : { scope: 'global' }
}

/**
 * Parse the editor JSON into the request consumed by the host. Accepts the
 * canonical request, a Claude `mcpServers` map, a flattened `serverName`+spec,
 * or a bare spec (deriving the serverName and defaulting the target).
 */
function parseRequest(text: string, mode: McpEditorMode, server: McpServer | undefined, invalid: string): McpEditorRequest {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error(invalid)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(invalid)
  const root = value as AnyRecord

  // Claude `mcpServers` map: unwrap to its single entry.
  let entry: AnyRecord = root
  if (root.mcpServers !== null && typeof root.mcpServers === 'object' && !Array.isArray(root.mcpServers)) {
    const pairs = Object.entries(root.mcpServers as AnyRecord)
    if (pairs.length !== 1) throw new Error(invalid)
    const [containerName, containerSpec] = pairs[0] as [string, unknown]
    if (containerSpec === null || typeof containerSpec !== 'object') throw new Error(invalid)
    entry = { ...(containerSpec as AnyRecord), serverName: containerName }
  }

  const spec = specOf(entry, invalid)
  if (spec === undefined) throw new Error(invalid)
  const serverName = typeof entry.serverName === 'string' && entry.serverName.trim() !== ''
    ? entry.serverName.trim()
    : deriveServerName(entry, sanitizeName(spec.type === 'stdio' ? spec.command : spec.url))
  if (serverName === '') throw new Error(invalid)

  const target = targetOf(entry, mode, server, invalid)
  const entryId = typeof entry.entryId === 'string' && entry.entryId.trim() !== ''
    ? entry.entryId.trim()
    : mode === 'edit' ? server?.entryId ?? '' : undefined
  if (mode === 'edit' && (entryId === undefined || entryId === '')) throw new Error(invalid)

  const result: McpEditorRequest = {
    target,
    serverName,
    spec,
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
      onSubmit(parseRequest(json, mode, server, t('mcp.form.jsonInvalid')))
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
