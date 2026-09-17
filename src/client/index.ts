/**
 * Context-injection settings section, browser half. Registers the
 * `settings.contextInjection` dictionaries and the one `settings.section` entry
 * that presents the Claude/Codex rule-injection master toggles, plus the `/btw`
 * answer card.
 *
 * MCP server management is a separate plugin
 * (`@zhang-guo-wen/dsh-mcp-manager`) with its own `settings.mcpManager` section
 * and Host Remote; this half mounts neither.
 *
 * The section reads and writes the `context-injection` namespace the Host
 * `@zhang-guo-wen/dsh-claude-compat` plugin owns, so toggles and the injection
 * behavior share one setting.
 * @module @zhang-guo-wen/dsh-claude-compat/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings namespace scope merge (ctx.settingsScope) and slot types.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the slot registry Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: declares the overlay slot this plugin's card registers into.
import type {} from './slot-declarations.ts'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { ContextInjectionSection } from './ContextInjectionSection.tsx'
import { BtwCard, type BtwCardInjected } from './BtwCard.tsx'
import { BtwCardRegistry, sessionStreamFactory } from './btw-card-controller.ts'
import { NS as BTW_NS, en as btwEn, zh as btwZh, type BtwCardKey } from './locales-btw.ts'
import { en, NS, zh, type ContextInjectionSectionKey } from './locales.ts'
import {
  CONTEXT_INJECTION_NS,
  ContextInjectionController,
  type ContextInjectionFlags,
} from './settings-controller.ts'

export type { ContextInjectionSectionProps } from './ContextInjectionSection.tsx'
export type { ContextInjectionSectionFace, ContextInjectionSectionState } from './settings-controller.ts'
export { NS } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** This plugin's settings section copy. */
    'settings.contextInjection': ContextInjectionSectionKey
    /** This plugin's `/btw` answer card copy. */
    'claudeCompatBtw': BtwCardKey
  }
}

/** Required services (cordis fiber inject). */
export const inject = [
  'slots', 'locale', 'settingsScope', 'remote', 'remote.session', 'workspaces',
]

/**
 * Register the dictionaries, the context-injection settings section, and the
 * `/btw` answer card.
 * @param ctx - client root context.
 */
export async function apply(ctx: Context): Promise<void> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-context-injection: dictionaries')
  const t = ctx.locale.bind(NS)
  const controller = new ContextInjectionController(
    ctx.settingsScope.bind<ContextInjectionFlags>({ namespace: CONTEXT_INJECTION_NS }),
  )
  ctx.effect(() => () => { controller.dispose() }, 'ui-context-injection: scope')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'context-injection',
    order: 13,
    label: () => t('nav'),
    locale: NS,
    inject: () => controller.inject(),
  }, ContextInjectionSection))

  // `/btw` answer card. The Host handler owns the fork and the prompt; this
  // half only reads the receipt the executor publishes in this process and
  // follows the forked Session it names. The card is keyed by the Session that
  // asked, because the overlay entry renders once per open Session.
  ctx.effect(() => ctx.locale.register(BTW_NS, { zh: btwZh, en: btwEn }), 'claude-compat: btw dictionaries')
  const cards = new BtwCardRegistry(
    (sessionId, onChange, onFailure) =>
      sessionStreamFactory(ctx.remote.session, sessionId, onChange, onFailure),
    // The registry owns the archive set; the plugin only names the Session.
    sessionId => ctx.workspaces.archiveSession(sessionId),
  )
  ctx.effect(() => () => { cards.dispose() }, 'claude-compat: btw cards')
  ctx.effect(
    () => ctx.on('command/executed', (sessionId, name, result) => {
      cards.observe(String(sessionId), name, result)
    }),
    'claude-compat: btw cards follow command/executed',
  )
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'btw-card',
    order: 20,
    locale: BTW_NS,
    inject: (): BtwCardInjected => ({
      hooks: { btwCard: cards.observable() },
      dismiss: sessionId => { cards.dismiss(sessionId) },
    }),
  }, BtwCard))
}
