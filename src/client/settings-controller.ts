/**
 * Controller bridging the Host `context-injection` settings namespace onto the
 * Harness-compat section snapshot. Reads the three compatibility switches —
 * skills, memory, and scoped rules — and flips one at a time through the
 * settings scope.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/client/settings-controller
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'

/** Settings namespace registered Host-side by @zhang-guo-wen/dsh-claude-compat. */
export const CONTEXT_INJECTION_NS = 'context-injection'

/** The three compatibility switches. */
export interface ContextInjectionFlags {
  skills: boolean
  memory: boolean
  rules: boolean
}

/** One independently switchable part of the compatibility surface. */
export type InjectionSwitch = keyof ContextInjectionFlags

/** Snapshot the section renders. */
export interface ContextInjectionSectionState {
  /** Whether the namespace is exposed to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  skills: boolean
  memory: boolean
  rules: boolean
}

/** Registration-side face for the section. */
export interface ContextInjectionSectionFace {
  hooks: {
    /** Section snapshot bound by the renderer as useContextInjection. */
    contextInjection: SnapshotStore<ContextInjectionSectionState>
  }
  /** Flip one compatibility switch. */
  toggle: (name: InjectionSwitch) => void
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
      toggle: name => { this.toggle(name) },
    }
  }

  private toggle(name: InjectionSwitch): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    const value = snapshot.value?.[name]
    if (value === undefined) return
    void this.scope.set(name, !value)
  }

  private projection(): ContextInjectionSectionState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      skills: snapshot.value?.skills ?? true,
      memory: snapshot.value?.memory ?? true,
      rules: snapshot.value?.rules ?? true,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
