/**
 * Rendering of injected instruction files.
 *
 * Every loader in this plugin folds files into a request as one `user` message
 * whose blocks read `Instructions from: <displayPath>` — the same header the
 * Harness's own `agent-instructions` uses, so a reader of the transcript sees
 * one convention whichever loader supplied the text.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/render
 */

/** One file's rendered contribution to an injected instructions message. */
export interface InstructionBlock {
  /** Model-facing path shown in the `Instructions from:` header. */
  displayPath: string
  /** The body rendered under that header. */
  content: string
}

/**
 * Render instruction blocks under an aggregate byte budget.
 *
 * The first block is always included — its own per-source cap bounds it — and
 * later blocks are added only while the complete rendered value stays within
 * `maxBytes`, so the budget bounds the whole message rather than each part.
 * @param blocks - the blocks to render, in model precedence order.
 * @param maxBytes - aggregate UTF-8 byte cap; zero or a non-finite value disables it.
 * @returns the rendered text.
 */
export function renderInstructionBlocks(blocks: readonly InstructionBlock[], maxBytes: number): string {
  const parts: string[] = []
  let bytes = 0
  for (const block of blocks) {
    const part = `Instructions from: ${block.displayPath}\n\n${block.content}`
    const separator = parts.length === 0 ? '' : '\n\n'
    const partBytes = byteLength(separator + part)
    if (parts.length > 0 && maxBytes > 0 && Number.isFinite(maxBytes) && bytes + partBytes > maxBytes) break
    parts.push(part)
    bytes += partBytes
  }
  return parts.join('\n\n')
}

/**
 * UTF-8 byte length of a string.
 * @param text - the text to measure.
 * @returns its length in bytes.
 */
export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8')
}

/**
 * Truncate text to a UTF-8 byte budget on a character boundary.
 * @param text - the text to truncate.
 * @param maxBytes - the byte budget; the whole text is returned when it fits.
 * @returns the longest prefix that fits without splitting a character.
 */
export function truncateToBytes(text: string, maxBytes: number): string {
  const buffer = Buffer.from(text, 'utf8')
  if (buffer.length <= maxBytes) return text
  let end = Math.max(0, maxBytes)
  // Walk back off a continuation byte so the cut lands on a character boundary.
  while (end > 0 && (buffer[end]! & 0xc0) === 0x80) end -= 1
  return buffer.subarray(0, end).toString('utf8')
}
