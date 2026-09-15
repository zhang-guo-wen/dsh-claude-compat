/**
 * Slot, event, and Context declarations this plugin's browser half depends on
 * but that its installed Harness packages do not deliver on their own:
 *
 * - `conversation.input.overlay` is declared by `ui-conversation` source, but
 *   the published `lib/types` of `@deepseek-ai/dsh-client-ui-conversation`
 *   predates the `conversation.input.*` keys. The running Harness composes that
 *   package from source, so the slot exists at runtime; this file only lets the
 *   plugin compile against the key it registers into.
 * - The `command/executed` emit and the `workspaces` Context service live in
 *   `ui-commands` and `workspace-controller` client entries; the type-only
 *   imports below pull those augmentations into this program without a runtime
 *   edge.
 *
 * Remove the slot declaration once the installed types carry it.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/client/slot-declarations
 */

import type {} from '@deepseek-ai/dsh-client-ui-commands/client'
// Type-only: the session-scoped standard props (sessionId) the card entry receives.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Floating entries rendered inside the resident composer card. */
    'conversation.input.overlay': { kind: 'list'; scope: 'session' }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * This browser client completed one admitted Host command execution. Other
     * clients receive the durable command node but never this local submission
     * acknowledgment, which is what carries the forked Session id back.
     * @param sessionId - Session addressed by the local submission.
     * @param name - Executed command name without the leading slash.
     * @param result - Host command result returned to this browser.
     * @mode emit
     */
    'command/executed'(sessionId: SessionId, name: string, result: CommandResult): void
  }
}

// A module marker: the augmentations above only apply from a module file.
export {}
