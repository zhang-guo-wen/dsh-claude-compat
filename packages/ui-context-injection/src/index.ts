/**
 * Host loader entry for the browser implementation exported from `./client`.
 *
 * This plugin is browser-only: the `context-injection` settings namespace is
 * registered by the Host `@deepseek-ai/dsh-claude-compat` plugin, so this host
 * entry is a no-op placeholder that lets the loader mount the real
 * `./client/index.ts` browser bundle.
 * @module @deepseek-ai/dsh-client-ui-context-injection
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'client-ui-context-injection'

/** No host-side work; the browser bundle lives in `./client`. */
export function apply(): void {}
