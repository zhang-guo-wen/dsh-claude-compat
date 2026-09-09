// @vitest-environment jsdom
import { describe, expect, it, vi, type Mock } from 'vitest'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ContextInjectionController,
  mapMcpServers,
  type ContextInjectionFlags,
  type McpServer,
} from '../src/client/settings-controller.ts'

/** A minimal Host settings scope the controller reads and writes. */
function fakeScope(
  initial: Partial<ContextInjectionFlags> = {},
  opts: { ready?: boolean; writable?: boolean; value?: ContextInjectionFlags | undefined } = {},
): {
  scope: SettingsScope<ContextInjectionFlags>
  set: Mock
} {
  let value: ContextInjectionFlags | undefined
  if ('value' in opts) value = opts.value
  else value = { claude: true, codex: true, systemPrompt: '', mcpDescriptions: {}, ...initial }
  const ready = opts.ready ?? true
  const writable = opts.writable ?? true
  const listeners = new Set<() => void>()
  const set = vi.fn((field: string, next: unknown) => {
    if (value === undefined) return
    value = { ...value, [field]: next }
    listeners.forEach(listener => listener())
  })
  const scope = {
    getSnapshot: () => ({ status: ready ? 'ready' as const : 'loading' as const, writable, value }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set,
    unset: () => {},
    mutate: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
  } as unknown as SettingsScope<ContextInjectionFlags>
  return { scope, set }
}

/** A ready roster of no MCP servers. */
const emptyMcps = (): Promise<readonly McpServer[]> => Promise.resolve([])

describe('mapMcpServers', () => {
  const SNAPSHOT = {
    entries: [
      { entryId: 'memory-engram', description: 'Memory river view', moduleName: '@deepseek-ai/dsh-mcp-client', enabled: true, fiberPhase: 'active' },
      { entryId: 'memorix', moduleName: '@deepseek-ai/dsh-mcp-client', enabled: false, fiberPhase: null },
      { entryId: 'tool-fs', moduleName: '@deepseek-ai/dsh-tool-fs', enabled: true, fiberPhase: 'active' },
    ],
    agentPresets: [
      {
        id: 'standard', trust: 'system', name: '标准模式', isDefault: true,
        rows: [
          { entryId: 'mcp-github', moduleName: '@deepseek-ai/dsh-mcp-client', enabled: 'conditional' as const, fiberPhase: null },
          { entryId: 'reader', moduleName: '@deepseek-ai/dsh-tool-read', enabled: true, fiberPhase: null },
        ],
      },
      {
        id: 'ptc', trust: 'system', name: 'ptc', isDefault: false,
        rows: [
          { entryId: null, moduleName: '@deepseek-ai/dsh-mcp-client', enabled: true, fiberPhase: 'pending' },
        ],
      },
    ],
  } as unknown as PluginInventorySnapshot

  it('projects every mcp-client occurrence across global and presets without dedup', () => {
    const servers = mapMcpServers(SNAPSHOT)
    // Global: memory-engram + memorix. Presets: standard/mcp-github + ptc (no-id row).
    expect(servers.map(s => s.serverName)).toEqual([
      'memory-engram', 'memorix', 'mcp-github', '@deepseek-ai/dsh-mcp-client',
    ])
    expect(servers[0]).toMatchObject({ scope: 'global', presetId: undefined, enabled: true, fiberPhase: 'active' })
    expect(servers[1]).toMatchObject({ scope: 'global', enabled: false, fiberPhase: null })
    expect(servers[2]).toMatchObject({ scope: 'preset', presetId: 'standard', enabled: 'conditional' })
    expect(servers[3]).toMatchObject({ scope: 'preset', presetId: 'ptc', enabled: true, fiberPhase: 'pending' })
  })

  it('returns an empty roster when no preset roster is composed', () => {
    const servers = mapMcpServers({ entries: [], agentPresets: undefined } as unknown as PluginInventorySnapshot)
    expect(servers).toEqual([])
  })
})

describe('ContextInjectionController', () => {
  it('projects the ready snapshot and exposes the section face', () => {
    const { scope } = fakeScope({ claude: true, codex: false, systemPrompt: 'hi' })
    const controller = new ContextInjectionController(scope, emptyMcps)

    const state = controller.inject().hooks.contextInjection.getSnapshot()
    expect(state.available).toBe(true)
    expect(state.writable).toBe(true)
    expect(state.claude).toBe(true)
    expect(state.codex).toBe(false)
    expect(state.systemPrompt).toBe('hi')

    expect(controller.inject().mcps).toBe(emptyMcps)
    controller.dispose()
  })

  it('toggles a field through the scope when ready and writable', () => {
    const { scope, set } = fakeScope({ claude: true, codex: true, systemPrompt: '' })
    const controller = new ContextInjectionController(scope, emptyMcps)

    controller.inject().toggle('claude')
    expect(set).toHaveBeenCalledWith('claude', false)
    controller.dispose()
  })

  it('ignores toggle writes when not ready or not writable', () => {
    const notReady = fakeScope({ claude: true, codex: true, systemPrompt: '' }, { ready: false })
    new ContextInjectionController(notReady.scope, emptyMcps).inject().toggle('claude')
    expect(notReady.set).not.toHaveBeenCalled()

    const notWritable = fakeScope({ claude: true, codex: true, systemPrompt: '' }, { writable: false })
    new ContextInjectionController(notWritable.scope, emptyMcps).inject().toggle('codex')
    expect(notWritable.set).not.toHaveBeenCalled()
  })

  it('ignores toggle writes when no value is held', () => {
    const { scope, set } = fakeScope({ claude: true, codex: true, systemPrompt: '' }, { value: undefined })
    const controller = new ContextInjectionController(scope, emptyMcps)
    controller.inject().toggle('claude')
    expect(set).not.toHaveBeenCalled()
    // Projection falls back to defaults when no value is held.
    const state = controller.inject().hooks.contextInjection.getSnapshot()
    expect(state.claude).toBe(true)
    expect(state.systemPrompt).toBe('')
    controller.dispose()
  })

  it('persists the system prompt through the scope', () => {
    const { scope, set } = fakeScope()
    const controller = new ContextInjectionController(scope, emptyMcps)
    controller.inject().updateSystemPrompt('answer in Chinese')
    expect(set).toHaveBeenCalledWith('systemPrompt', 'answer in Chinese')
    controller.dispose()
  })

  it('ignores system-prompt writes when not ready or not writable', () => {
    const notReady = fakeScope(undefined, { ready: false })
    new ContextInjectionController(notReady.scope, emptyMcps).inject().updateSystemPrompt('x')
    expect(notReady.set).not.toHaveBeenCalled()

    const notWritable = fakeScope(undefined, { writable: false })
    new ContextInjectionController(notWritable.scope, emptyMcps).inject().updateSystemPrompt('x')
    expect(notWritable.set).not.toHaveBeenCalled()
  })

  it('persists an MCP description through the scope', () => {
    const { scope, set } = fakeScope()
    const controller = new ContextInjectionController(scope, emptyMcps)
    controller.inject().updateMcpDescription('global:engram', 'Memory river view')
    expect(set).toHaveBeenCalledWith('mcpDescriptions', { 'global:engram': 'Memory river view' })
    controller.dispose()
  })

  it('removes an MCP description when cleared', () => {
    const { scope, set } = fakeScope({ claude: true, codex: true, systemPrompt: '', mcpDescriptions: { 'global:engram': 'x' } })
    const controller = new ContextInjectionController(scope, emptyMcps)
    controller.inject().updateMcpDescription('global:engram', '')
    expect(set).toHaveBeenCalledWith('mcpDescriptions', {})
    controller.dispose()
  })

  it('publishes a fresh projection when the scope notifies', () => {
    const { scope, set } = fakeScope({ claude: true, codex: true, systemPrompt: '' }, { writable: true })
    const controller = new ContextInjectionController(scope, emptyMcps)
    const store = controller.inject().hooks.contextInjection
    expect(store.getSnapshot().claude).toBe(true)
    // Simulate a Host write landing: the scope mutates value and notifies.
    set('claude', false)
    expect(store.getSnapshot().claude).toBe(false)
    controller.dispose()
  })
})
