/**
 * Message sources for this plugin's context contributors.
 *
 * A durable message carries a producer-owned source kind. The harness retired
 * the generic `plugin` wrapper — `assertV4MessageSources` refuses a session row
 * that still names it — so each contributor declares its own kind here.
 *
 * The spelling is the one the V3-to-V4 conversion gives a third-party producer:
 * a released `{ kind: 'plugin', plugin: P }` record whose producer is neither
 * renamed nor first-party becomes `plugin:P`. Declaring the same spelling means
 * a Session resumed across that conversion and a Session written now agree on
 * one kind, so `isInstructionsSource` sees one identity rather than two.
 *
 * This module also keeps reading the shapes earlier releases wrote: the
 * bespoke `claude-code` / `claude-memory` / `claude-rule` kinds, and the generic
 * `plugin` wrapper carrying this package's identity. Neither is written again —
 * a released Session format migrates only the kinds a released distribution can
 * produce, which is why the two bespoke kinds made older Sessions unreadable and
 * were replaced by the producer-owned kind above.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/sources
 */

import type { ContextFormed, MessageSource } from '@deepseek-ai/dsh-llm'

/** Package identity recorded on every injected message this plugin produces. */
export const PLUGIN_ID = '@zhang-guo-wen/dsh-claude-compat'

/**
 * A contributor inside this plugin that injects instructions. `claude-code`
 * carries the session-start memory batch, `claude-memory` a directory's memory
 * folded after a read, and `claude-rule` a scoped rule.
 */
export type LoaderName = 'claude-code' | 'claude-memory' | 'claude-rule'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'plugin:@zhang-guo-wen/dsh-claude-compat#claude-code':
      { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-code' } & ContextFormed
    'plugin:@zhang-guo-wen/dsh-claude-compat#claude-memory':
      { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-memory' } & ContextFormed
    'plugin:@zhang-guo-wen/dsh-claude-compat#claude-rule':
      { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-rule' } & ContextFormed
  }
}

/** The producer-owned kind one contributor records. */
export type InstructionsSourceKind = `plugin:${typeof PLUGIN_ID}#${LoaderName}`

/** One contributor's source: its own kind and the instructions form. */
const INSTRUCTIONS_SOURCES: Readonly<Record<LoaderName, MessageSource>> = {
  'claude-code': { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-code', form: 'instructions' },
  'claude-memory': { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-memory', form: 'instructions' },
  'claude-rule': { kind: 'plugin:@zhang-guo-wen/dsh-claude-compat#claude-rule', form: 'instructions' },
}

/**
 * The source for one contributor's injected instructions.
 * @param loader - contributor that produced the content.
 * @returns an instructions-form model source owned by this plugin.
 */
export function instructionsSource(loader: LoaderName): MessageSource {
  return { ...INSTRUCTIONS_SOURCES[loader] }
}

/**
 * Whether one logged message source came from this plugin's `<loader>`
 * contributor.
 *
 * The contributors ask this of a session log to avoid folding the same rules in
 * twice. Every shape this package has ever written answers yes: the current
 * producer-owned kind, the generic `plugin` wrapper it replaced, and the two
 * bespoke kinds written before either. Reading the retired names back never
 * writes them again — it only keeps a resumed Session that already carries the
 * content from receiving it a second time.
 * @param source - a logged message's `source` value, of unknown provenance.
 * @param loader - contributor whose earlier injection is being looked for.
 * @returns whether that contributor already supplied instructions here.
 */
export function isInstructionsSource(
  source: unknown,
  loader: LoaderName,
): boolean {
  if (typeof source !== 'object' || source === null) return false
  const kind = (source as { kind?: unknown }).kind
  if (kind === loader) return true
  if (kind === `plugin:${PLUGIN_ID}#${loader}`) return true
  return kind === 'plugin' && (source as { plugin?: unknown }).plugin === `${PLUGIN_ID}#${loader}`
}
