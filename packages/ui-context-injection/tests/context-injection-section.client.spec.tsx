// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextInjectionSection } from '../src/client/ContextInjectionSection.tsx'
import type { ContextInjectionSectionProps } from '../src/client/ContextInjectionSection.tsx'
import type { ContextInjectionSectionState, McpServer } from '../src/client/settings-controller.ts'
import { en, type ContextInjectionSectionKey } from '../src/client/locales.ts'

afterEach(cleanup)

const t = ((key: ContextInjectionSectionKey, params?: Record<string, string>): string =>
  Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    en[key],
  )) as ContextInjectionSectionProps['t']

// One row per status branch so the mapping helpers are fully exercised.
const SAMPLE_MCPS: readonly McpServer[] = [
  { serverName: 'engram', scope: 'global', presetId: undefined, enabled: true, fiberPhase: 'active' },
  { serverName: 'memorix', scope: 'global', presetId: undefined, enabled: false, fiberPhase: null },
  { serverName: 'github', scope: 'preset', presetId: 'standard', enabled: 'conditional', fiberPhase: null },
  { serverName: 'planner', scope: 'global', presetId: undefined, enabled: true, fiberPhase: null },
  { serverName: 'ddb', scope: 'preset', presetId: 'standard', enabled: true, fiberPhase: 'pending' },
  { serverName: 'web', scope: 'global', presetId: undefined, enabled: true, fiberPhase: 'loading' },
  { serverName: 'search', scope: 'global', presetId: undefined, enabled: true, fiberPhase: 'failed' },
  { serverName: 'old', scope: 'global', presetId: undefined, enabled: true, fiberPhase: 'unloading' },
  { serverName: 'edge', scope: 'preset', presetId: undefined, enabled: true, fiberPhase: 'pending' },
]

function makeProps(
  state: Partial<ContextInjectionSectionState> = {},
  mcps: () => Promise<readonly McpServer[]> = () => Promise.resolve(SAMPLE_MCPS),
): {
  props: ContextInjectionSectionProps
  toggle: ReturnType<typeof vi.fn>
  updateSystemPrompt: ReturnType<typeof vi.fn>
  updateMcpDescription: ReturnType<typeof vi.fn>
} {
  const snapshot: ContextInjectionSectionState = {
    available: true, writable: true, claude: true, codex: true, systemPrompt: '', mcpDescriptions: {}, ...state,
  }
  const toggle = vi.fn()
  const updateSystemPrompt = vi.fn()
  const updateMcpDescription = vi.fn()
  const props = {
    t,
    useContextInjection: (selector: (value: ContextInjectionSectionState) => unknown) => selector(snapshot),
    toggle,
    updateSystemPrompt,
    updateMcpDescription,
    mcps,
  } as unknown as ContextInjectionSectionProps
  return { props, toggle, updateSystemPrompt, updateMcpDescription }
}

describe('ContextInjectionSection', () => {
  it('shows the prompt tab first: intro, system-prompt box, and both toggles', () => {
    render(<ContextInjectionSection {...makeProps().props} />)

    expect(screen.getByText(t('prompt.intro'))).toBeTruthy()
    expect(screen.getByRole('textbox')).toHaveProperty('value', '')
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
    expect(switches[0]?.getAttribute('aria-checked')).toBe('true')
    expect(switches[1]?.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText(t('unavailable'))).toBeNull()
  })

  it('commits the system prompt on blur', () => {
    const { props, updateSystemPrompt } = makeProps()
    render(<ContextInjectionSection {...props} />)

    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'Be concise.' } })
    fireEvent.blur(box)
    expect(updateSystemPrompt).toHaveBeenCalledWith('Be concise.')
  })

  it('toggles a rule switch through the controller callback', () => {
    const { props, toggle } = makeProps()
    render(<ContextInjectionSection {...props} />)

    fireEvent.click(screen.getByRole('switch', { name: t('claude') }))
    expect(toggle).toHaveBeenCalledWith('claude')
  })

  it('renders the real MCP roster with config scope and load status', async () => {
    const view = render(<ContextInjectionSection {...makeProps({
      mcpDescriptions: { 'global:engram': 'Memory river view', 'preset:standard:github': 'GitHub tools' },
    }).props} />)

    fireEvent.click(screen.getByRole('tab', { name: t('tab.mcp') }))
    await screen.findByText('engram')

    expect(screen.getAllByText(t('mcp.status.active'))).toHaveLength(1)
    expect(screen.getByText(t('mcp.status.disabled'))).toBeTruthy()
    expect(screen.getByText(t('mcp.status.conditional'))).toBeTruthy()
    expect(screen.getByText(t('mcp.status.configured'))).toBeTruthy()
    expect(screen.getAllByText(t('mcp.status.pending'))).toHaveLength(2)
    expect(screen.getByText(t('mcp.status.loading'))).toBeTruthy()
    expect(screen.getByText(t('mcp.status.failed'))).toBeTruthy()
    expect(screen.getByText(t('mcp.status.unloading'))).toBeTruthy()
    expect(view.container.querySelectorAll('[data-mcp-scope="preset"]')).toHaveLength(3)
    expect(view.container.querySelectorAll('[data-mcp-scope="global"]').length).toBeGreaterThan(0)
    expect(view.container.querySelector('[data-mcp-name="github"]')).not.toBeNull()
    expect(screen.getByText(t('mcp.subtitle'))).toBeTruthy()

    // Config scope stays on the right (badge); plugin-owned descriptions render as values.
    expect(screen.getAllByText(t('mcp.scopeGlobal')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(`${t('mcp.scopePreset')} · standard`)).toHaveLength(2)
    expect(screen.getByDisplayValue('Memory river view')).toBeTruthy()
    expect(screen.getByDisplayValue('GitHub tools')).toBeTruthy()
  })

  it('shows the empty message when no MCP server is configured', async () => {
    const { props } = makeProps({}, () => Promise.resolve([]))
    render(<ContextInjectionSection {...props} />)

    fireEvent.click(screen.getByRole('tab', { name: t('tab.mcp') }))
    expect(await screen.findByText(t('mcp.empty'))).toBeTruthy()
  })

  it('shows an error and retries when the roster read fails', async () => {
    const mcps = vi.fn<() => Promise<readonly McpServer[]>>()
      .mockRejectedValueOnce(new Error('transport down'))
      .mockResolvedValueOnce(SAMPLE_MCPS)
    const { props } = makeProps({}, mcps)
    render(<ContextInjectionSection {...props} />)

    fireEvent.click(screen.getByRole('tab', { name: t('tab.mcp') }))
    expect((await screen.findByRole('alert')).textContent).toBe(t('mcp.error'))
    fireEvent.click(screen.getByRole('button', { name: t('mcp.retry') }))
    await waitFor(() => { expect(mcps).toHaveBeenCalledTimes(2) })
    expect(await screen.findByText('engram')).toBeTruthy()
  })

  it('edits a plugin-owned MCP description on blur', async () => {
    const { props, updateMcpDescription } = makeProps()
    render(<ContextInjectionSection {...props} />)
    fireEvent.click(screen.getByRole('tab', { name: t('tab.mcp') }))
    await screen.findByText('engram')

    const desc = screen.getAllByLabelText(t('mcp.descriptionLabel'))[0]! as HTMLInputElement
    fireEvent.change(desc, { target: { value: 'Memory river view' } })
    fireEvent.blur(desc)
    expect(updateMcpDescription).toHaveBeenCalledWith('global:engram', 'Memory river view')
  })

  it('does not write when the system-prompt box is blurred without edits', () => {
    const { props, updateSystemPrompt } = makeProps()
    render(<ContextInjectionSection {...props} />)
    fireEvent.blur(screen.getByRole('textbox'))
    expect(updateSystemPrompt).not.toHaveBeenCalled()
  })

  it('ignores a roster that settles after unmount', async () => {
    const ok = Promise.withResolvers<readonly McpServer[]>()
    const okView = render(<ContextInjectionSection {...makeProps({}, () => ok.promise).props} />)
    okView.unmount()
    await act(async () => { ok.resolve(SAMPLE_MCPS) })

    const err = Promise.withResolvers<readonly McpServer[]>()
    const errView = render(<ContextInjectionSection {...makeProps({}, () => err.promise).props} />)
    errView.unmount()
    await act(async () => { err.reject(new Error('late failure')) })
  })

  it('returns to the prompt tab from the MCP tab', async () => {
    render(<ContextInjectionSection {...makeProps().props} />)
    fireEvent.click(screen.getByRole('tab', { name: t('tab.mcp') }))
    await screen.findByText('engram')
    fireEvent.click(screen.getByRole('tab', { name: t('tab.prompt') }))
    expect(screen.getByText(t('prompt.intro'))).toBeTruthy()
    expect(screen.queryByText('engram')).toBeNull()
  })

  it('disables the controls when settings are unavailable', () => {
    render(<ContextInjectionSection {...makeProps({ available: false }).props} />)

    expect(screen.getByText(t('unavailable'))).toBeTruthy()
    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true)
    expect((screen.getAllByRole('switch')[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables the controls when the document is not writable', () => {
    render(<ContextInjectionSection {...makeProps({ writable: false }).props} />)

    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true)
    expect(screen.getAllByRole('switch')[0]).toHaveProperty('disabled', true)
  })
})
