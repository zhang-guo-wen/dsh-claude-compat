/**
 * Context-injection settings section, browser half. Registers the
 * `settings.contextInjection` dictionary and the one `settings.section` entry
 * that presents the Claude compatibility master switch.
 *
 * The section reads and writes the `claude-compat` namespace the Host
 * `@guowenzhang/dsh-claude-compat` row owns, so the switch and the
 * injection behavior share one setting.
 * @module @guowenzhang/dsh-claude-compat/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the configuration-form service merge (ctx.configForms) and slot types.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the slot registry Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { ContextInjectionSection } from './ContextInjectionSection.tsx'
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
  }
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Register the dictionary and the context-injection settings section.
 * @param ctx - client root context.
 */
export async function apply(ctx: Context): Promise<void> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-context-injection: dictionaries')
  const t = ctx.locale.bind(NS)
  const controller = new ContextInjectionController(
    ctx.configForms.get<ContextInjectionFlags>(CONTEXT_INJECTION_NS),
  )
  ctx.effect(() => () => { controller.dispose() }, 'ui-context-injection: settings form')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'context-injection',
    order: 13,
    label: () => t('nav'),
    locale: NS,
    inject: () => controller.inject(),
  }, ContextInjectionSection))
}
