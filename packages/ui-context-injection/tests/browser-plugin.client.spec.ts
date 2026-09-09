// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply, name } from '../src/index.ts'
import { apply as applyClient } from '../src/client/index.ts'
import { NS } from '../src/client/locales.ts'
import { CONTEXT_INJECTION_NS, type ContextInjectionSectionFace } from '../src/client/settings-controller.ts'

function fakeScope(): unknown {
  const value = { claude: true, codex: true, systemPrompt: '' }
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => ({ status: 'ready' as const, writable: true, value }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: () => {},
    unset: () => {},
    mutate: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
  }
}

function stubCtx(): {
  ctx: Context
  disposers: Array<() => void>
  face: () => ContextInjectionSectionFace | undefined
  list: ReturnType<typeof vi.fn>
} {
  const disposers: Array<() => void> = []
  let capturedFace: ContextInjectionSectionFace | undefined
  const list = vi.fn()
  const ctx = {
    effect: vi.fn((fn: () => unknown) => {
      const result = fn()
      if (typeof result === 'function') disposers.push(result as () => void)
    }),
    locale: {
      register: vi.fn(),
      bind: vi.fn(() => (key: string) => key),
    },
    settingsScope: {
      bind: vi.fn(() => fakeScope()),
    },
    remote: {
      pluginInventory: { list },
    },
    slots: {
      inject: vi.fn((_name: string, factory: () => void) => { factory() }),
      register: vi.fn((options: { label: () => string; inject: () => unknown }) => {
        options.label()
        capturedFace = options.inject() as ContextInjectionSectionFace
        return () => {}
      }),
    },
  }
  return { ctx: ctx as unknown as Context, disposers, face: () => capturedFace, list }
}

describe('browser plugin', () => {
  it('exposes the host name and a no-op host apply', () => {
    expect(name).toBe('client-ui-context-injection')
    expect(apply()).toBeUndefined()
  })

  it('registers dictionaries and the Harness-compat section through the slots', () => {
    const { ctx, disposers } = stubCtx()
    applyClient(ctx)

    expect(ctx.locale.register).toHaveBeenCalledWith(NS, expect.objectContaining({
      zh: expect.any(Object),
      en: expect.any(Object),
    }))
    expect(ctx.settingsScope.bind).toHaveBeenCalledWith({ namespace: CONTEXT_INJECTION_NS })
    expect(ctx.locale.bind).toHaveBeenCalledWith(NS)
    expect(ctx.slots.inject).toHaveBeenCalledWith('settings.section', expect.any(Function))
    expect(ctx.slots.register).toHaveBeenCalled()
    // The settings-scope disposer is owned by the caller's fiber.
    expect(disposers).toHaveLength(1)
    for (const dispose of disposers) dispose()
  })

  it('loads the MCP roster through the plugin-inventory remote', async () => {
    const { ctx, face, list } = stubCtx()
    list.mockResolvedValueOnce({ ok: true, value: { entries: [], agentPresets: undefined } })
    applyClient(ctx)

    const servers = await face()?.mcps()
    expect(servers).toEqual([])
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('surfaces an MCP roster read failure', async () => {
    const { ctx, face, list } = stubCtx()
    list.mockResolvedValueOnce({ ok: false, error: { code: 'PRIVATE', message: 'transport down' } })
    applyClient(ctx)

    await expect(face()?.mcps()).rejects.toThrow('pluginInventory.list failed: PRIVATE: transport down')
  })
})
