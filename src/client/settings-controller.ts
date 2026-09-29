/**
 * Controller bridging the Host `claude-compat` settings namespace onto the
 * Harness-compat section snapshot. Reads the compatibility switches for
 * skills, memory loading and writing, and scoped rules, then flips one through the
 * configuration form.
 *
 * @module @guowenzhang/dsh-claude-compat/client/settings-controller
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'

/** Settings namespace registered Host-side by @guowenzhang/dsh-claude-compat: the Loader row id. */
export const CONTEXT_INJECTION_NS = 'claude-compat'

/** The compatibility switches. */
export interface ContextInjectionFlags {
  skills: boolean
  memory: boolean
  memoryWrite: boolean
  rules: boolean
}

/** One switchable part of the compatibility surface. */
export type InjectionSwitch = keyof ContextInjectionFlags

/** Snapshot the section renders. */
export interface ContextInjectionSectionState {
  /** Whether the namespace is exposed to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  skills: boolean
  memory: boolean
  memoryWrite: boolean
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
   * @param scope - the `claude-compat` configuration form.
   */
  constructor(private readonly scope: ConfigForm<ContextInjectionFlags>) {
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
    if (name === 'memoryWrite' && !snapshot.value?.memory) return
    if (name === 'memory' && value && snapshot.value?.memoryWrite) {
      // Commit both fields in one Host mutation, so no saved state violates the dependency.
      void this.scope.mutate([
        { op: 'set', path: ['memoryWrite'], value: false },
        { op: 'set', path: ['memory'], value: false },
      ])
      return
    }
    void this.scope.set(name, !value)
  }

  private projection(): ContextInjectionSectionState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      skills: snapshot.value?.skills ?? true,
      memory: snapshot.value?.memory ?? true,
      memoryWrite: (snapshot.value?.memory ?? true) && (snapshot.value?.memoryWrite ?? false),
      rules: snapshot.value?.rules ?? true,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
