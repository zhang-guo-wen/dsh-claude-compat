/**
 * Message sources for this plugin's context contributors.
 *
 * A released Session format migrates only the message-source kinds a released
 * distribution can produce. The V2-to-V3 edge validates every logged source
 * against one fixed historical kind set and refuses the whole artifact when it
 * meets an unknown one, so a Session written by a plugin that invented a kind
 * can never be opened again by a later harness — `codex` and `claude-code` were
 * exactly that mistake here.
 *
 * `MessageSourceMap` is merge-extensible and the harness documents it as
 * "plugins add their own kinds", but that extension point belongs to the
 * distribution: the generic `plugin` kind is what a third-party package records
 * with, carrying its identity in `plugin` instead of in the kind.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/sources
 */

import type { MessageSource } from '@deepseek-ai/dsh-llm'

/** Package identity recorded on every injected message this plugin produces. */
export const PLUGIN_ID = '@zhang-guo-wen/dsh-claude-compat'

/**
 * The source for one contributor's injected instructions. The loader name rides
 * in `plugin` so a transcript row still names which loader supplied the text,
 * while the durable kind stays inside the released set.
 * @param loader - contributor that produced the content.
 * @returns an instructions-form model source owned by this plugin.
 */
export function instructionsSource(loader: 'claude-code' | 'codex' | 'claude-rule'): MessageSource {
  return { kind: 'plugin', plugin: `${PLUGIN_ID}#${loader}`, form: 'instructions' }
}

/**
 * Whether one logged message source came from this plugin's `<loader>`
 * contributor.
 *
 * The contributors ask this of a session log to avoid folding the same rules in
 * twice. Both shapes answer yes: the current `plugin` source, and the two
 * bespoke kinds this package wrote before it moved onto that source. Reading the
 * legacy names back never writes them again — it only keeps a resumed Session
 * that already carries the content from receiving it a second time.
 * @param source - a logged message's `source` value, of unknown provenance.
 * @param loader - contributor whose earlier injection is being looked for.
 * @returns whether that contributor already supplied instructions here.
 */
export function isInstructionsSource(
  source: unknown,
  loader: 'claude-code' | 'codex' | 'claude-rule',
): boolean {
  if (typeof source !== 'object' || source === null) return false
  const kind = (source as { kind?: unknown }).kind
  if (kind === loader) return true
  return kind === 'plugin' && (source as { plugin?: unknown }).plugin === `${PLUGIN_ID}#${loader}`
}
