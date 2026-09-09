/**
 * Context-injection settings section, browser half. Registers the
 * `settings.contextInjection` dictionaries and the one `settings.section` entry
 * that presents the Claude/Codex rule-injection master toggles.
 *
 * The section reads and writes the `context-injection` namespace the Host
 * `@deepseek-ai/dsh-claude-compat` plugin owns, so toggles and the injection
 * behavior share one setting.
 * @module @deepseek-ai/dsh-client-ui-context-injection
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings namespace scope merge (ctx.settingsScope) and slot types.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the slot registry Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the Remote namespaces this plugin reads (ctx.remote.pluginInventory).
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { ContextInjectionSection } from './ContextInjectionSection.tsx'
import { en, NS, zh, type ContextInjectionSectionKey } from './locales.ts'
import {
  CONTEXT_INJECTION_NS,
  ContextInjectionController,
  mapMcpServers,
  type ContextInjectionFlags,
  type McpServer,
} from './settings-controller.ts'

export type { ContextInjectionSectionProps } from './ContextInjectionSection.tsx'
export type { ContextInjectionSectionFace, ContextInjectionSectionState, McpServer } from './settings-controller.ts'
export { NS } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** This plugin's settings section copy. */
    'settings.contextInjection': ContextInjectionSectionKey
  }
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope', 'remote', 'remote.pluginInventory']

/**
 * Register the dictionaries and the context-injection settings section.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-context-injection: dictionaries')
  const t = ctx.locale.bind(NS)
  const mcps = async (): Promise<readonly McpServer[]> => {
    const result = await ctx.remote.pluginInventory.list()
    if (!result.ok) {
      throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`)
    }
    return mapMcpServers(result.value)
  }
  const controller = new ContextInjectionController(
    ctx.settingsScope.bind<ContextInjectionFlags>({ namespace: CONTEXT_INJECTION_NS }),
    mcps,
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
}
