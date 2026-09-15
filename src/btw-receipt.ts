/**
 * The `/btw` receipt text: the one shape both halves of the command share.
 *
 * The Host command writes the acknowledgement and the browser card reads it
 * back to learn which Session was forked. Keeping the wording here — in a module
 * with no runtime imports — lets the client half derive the Session id without
 * importing the Host command module and its Node-only dependencies.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/btw-receipt
 */

import type { CommandResult } from '@deepseek-ai/dsh-commands'

/** Prefix of the `/btw` acknowledgement; the forked Session id follows it. */
export const STARTED_PREFIX = 'Started /btw as child session '

/**
 * Render the `/btw` acknowledgement for one forked Session.
 * @param childSessionId - the forked Session's durable id.
 * @returns the command success text.
 */
export function startedText(childSessionId: string): string {
  return `${STARTED_PREFIX}${childSessionId}. The answer and any follow-up live there.`
}

/**
 * Recover the forked Session id from a `/btw` receipt.
 * @param result - the Host handler's settled command result.
 * @returns the forked Session id, or null when the receipt is not a success.
 */
export function childSessionOf(result: CommandResult): string | null {
  if (result.kind !== 'success' || result.text === undefined) return null
  if (!result.text.startsWith(STARTED_PREFIX)) return null
  const rest = result.text.slice(STARTED_PREFIX.length)
  const end = rest.indexOf('.')
  const id = (end === -1 ? rest : rest.slice(0, end)).trim()
  return id.length === 0 ? null : id
}
