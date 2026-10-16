/**
 * Controller bridging the Host `claude-compat` settings namespace onto the
 * Harness-compat section snapshot. Reads the compatibility switches for
 * skills, prompt files, auto memory, memory writing, and scoped rules, then
 * flips one through the configuration form.
 *
 * A flip is asynchronous, so each switch publishes its own write state: the
 * section shows 保存中 / 已保存 / 失败 beside the switch that was flipped, and
 * the Host's committed value stays the source of the switch position (a failed
 * write therefore leaves the switch where it was). Every switch writes only
 * itself: the Host keeps no switch dependent on another.
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
  autoMemory: boolean
  memoryWrite: boolean
  rules: boolean
}

/** One switchable part of the compatibility surface. */
export type InjectionSwitch = keyof ContextInjectionFlags

/** One switch's write, as the section reports it. */
export type SwitchSave =
  | { readonly phase: 'idle' | 'saving' | 'saved' }
  | { readonly phase: 'failed'; readonly message: string }

/** The resting write state, shared because it carries no per-switch data. */
const IDLE: SwitchSave = { phase: 'idle' }

/** How long a successful write keeps its note before the row goes quiet. */
const SAVED_NOTE_MS = 2_000

/** Snapshot the section renders. */
export interface ContextInjectionSectionState {
  /** Whether the namespace is exposed to this client. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  skills: boolean
  memory: boolean
  autoMemory: boolean
  memoryWrite: boolean
  rules: boolean
  /** Per-switch write state, so one failed write is reported where it happened. */
  saves: Readonly<Record<InjectionSwitch, SwitchSave>>
}

/** Registration-side face for the section. */
export interface ContextInjectionSectionFace {
  hooks: {
    /** Section snapshot bound by the renderer as useContextInjection. */
    contextInjection: SnapshotStore<ContextInjectionSectionState>
  }
  /**
   * Flip one compatibility switch and resolve after the Host answered. The
   * same call retries a failed flip, because a failure leaves the switch on the
   * value the Host committed.
   */
  toggle: (name: InjectionSwitch) => Promise<void>
}

/** Owner handle over the `claude-compat` namespace. */
export class ContextInjectionController {
  private readonly store: SnapshotStore<ContextInjectionSectionState>
  private readonly unsubscribe: () => void
  private readonly saves = new Map<InjectionSwitch, SwitchSave>()
  private readonly saveTimers = new Map<InjectionSwitch, ReturnType<typeof setTimeout>>()

  /**
   * @param scope - the `claude-compat` configuration form.
   */
  constructor(private readonly scope: ConfigForm<ContextInjectionFlags>) {
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = scope.subscribe(() => this.publish())
  }

  /** Stop observing settings and drop any pending note timers. */
  dispose(): void {
    this.unsubscribe()
    for (const timer of this.saveTimers.values()) clearTimeout(timer)
    this.saveTimers.clear()
  }

  /** Build the renderer face for this section. */
  inject(): ContextInjectionSectionFace {
    return {
      hooks: { contextInjection: this.store },
      toggle: name => this.toggle(name),
    }
  }

  private async toggle(name: InjectionSwitch): Promise<void> {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || !snapshot.writable) return
    const value = snapshot.value?.[name]
    if (value === undefined) return
    this.setSave(name, { phase: 'saving' })
    try {
      await this.scope.set(name, !value)
    } catch (error) {
      this.setSave(name, { phase: 'failed', message: error instanceof Error ? error.message : String(error) })
      return
    }
    this.setSave(name, { phase: 'saved' })
    this.scheduleNoteClear(name)
  }

  /** Publish one switch's write state, which is what the section renders. */
  private setSave(name: InjectionSwitch, save: SwitchSave): void {
    this.saves.set(name, save)
    this.publish()
  }

  /** Drop a success note after a moment, so it does not become a permanent label. */
  private scheduleNoteClear(name: InjectionSwitch): void {
    const previous = this.saveTimers.get(name)
    if (previous !== undefined) clearTimeout(previous)
    this.saveTimers.set(name, setTimeout(() => {
      this.saveTimers.delete(name)
      if (this.saves.get(name)?.phase === 'saved') this.setSave(name, IDLE)
    }, SAVED_NOTE_MS))
  }

  private projection(): ContextInjectionSectionState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      skills: snapshot.value?.skills ?? true,
      memory: snapshot.value?.memory ?? true,
      autoMemory: snapshot.value?.autoMemory ?? true,
      memoryWrite: snapshot.value?.memoryWrite ?? false,
      rules: snapshot.value?.rules ?? true,
      saves: {
        skills: this.saves.get('skills') ?? IDLE,
        memory: this.saves.get('memory') ?? IDLE,
        autoMemory: this.saves.get('autoMemory') ?? IDLE,
        memoryWrite: this.saves.get('memoryWrite') ?? IDLE,
        rules: this.saves.get('rules') ?? IDLE,
      },
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
