/**
 * Controller bridging the Host `context-injection` settings namespace onto the
 * Harness-compat section snapshot. Reads the two rule-injection toggles and the
 * user system prompt, and writes one field at a time through the settings
 * scope.
 *
 * MCP server management is a separate plugin
 * (`@zhang-guo-wen/dsh-mcp-manager`) with its own section and namespace; this
 * controller carries no MCP state.
 * @module @zhang-guo-wen/dsh-claude-compat/client/settings-controller
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'

/** Settings namespace registered Host-side by @zhang-guo-wen/dsh-claude-compat. */
export const CONTEXT_INJECTION_NS = 'context-injection'

/** The two master toggles and the user system prompt. */
export interface ContextInjectionFlags {
  claude: boolean
  codex: boolean
  systemPrompt: string
}

/** Snapshot the section renders. */
export interface ContextInjectionSectionState {
  /** Whether the namespace is exposed to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  claude: boolean
  codex: boolean
  systemPrompt: string
}

/** Registration-side face for the section. */
export interface ContextInjectionSectionFace {
  hooks: {
    /** Section snapshot bound by the renderer as useContextInjection. */
    contextInjection: SnapshotStore<ContextInjectionSectionState>
  }
  /** Flip one master toggle. */
  toggle: (name: 'claude' | 'codex') => void
  /** Persist the system prompt text the user committed. */
  updateSystemPrompt: (value: string) => void
}

/** Owner handle over the `context-injection` namespace. */
export class ContextInjectionController {
  private readonly store: SnapshotStore<ContextInjectionSectionState>
  private readonly unsubscribe: () => void

  /**
   * @param scope - bound `context-injection` settings scope.
   */
  constructor(private readonly scope: SettingsScope<ContextInjectionFlags>) {
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = scope.subscribe(() => this.publish())
  }

  /** Stop observing settings. */
  dispose(): void {
    this.unsubscribe()
  }

  /** Build the renderer face for this section. */
  inject(): ContextInjectionSectionFace {
    return {
      hooks: { contextInjection: this.store },
      toggle: (name) => { this.toggle(name) },
      updateSystemPrompt: (value) => { this.updateSystemPrompt(value) },
    }
  }

  private toggle(name: 'claude' | 'codex'): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    const value = snapshot.value?.[name]
    if (value === undefined) return
    void this.scope.set(name, !value)
  }

  private updateSystemPrompt(value: string): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    void this.scope.set('systemPrompt', value)
  }

  private projection(): ContextInjectionSectionState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      claude: snapshot.value?.claude ?? true,
      codex: snapshot.value?.codex ?? true,
      systemPrompt: snapshot.value?.systemPrompt ?? '',
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
