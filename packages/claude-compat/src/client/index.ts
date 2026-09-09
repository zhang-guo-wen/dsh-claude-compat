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
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { ContextInjectionSection } from './ContextInjectionSection.tsx'
import { en, NS, zh, type ContextInjectionSectionKey } from './locales.ts'
import {
  CONTEXT_INJECTION_NS,
  ContextInjectionController,
  mapMcpServers,
  type ContextInjectionFlags,
  type McpAuthoringActions,
  type McpServer,
} from './settings-controller.ts'
import { TYPERT_REMOTE, REMOTE_NAMESPACE } from '../remote.ts'
import type {
  AddMcpRequest,
  DisableMcpRequest,
  EditMcpRequest,
  McpMutationResult,
} from '../types.ts'

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

/** The namespace service this plugin mounts itself — fetched via `ctx.get`, never injected. */
interface ClaudeCompatMcpNamespace {
  addMcp(request: AddMcpRequest): Promise<RemoteResult<McpMutationResult>>
  editMcp(request: EditMcpRequest): Promise<RemoteResult<McpMutationResult>>
  disableMcp(request: DisableMcpRequest): Promise<RemoteResult<McpMutationResult>>
}

/** Unwrap a Typert `RemoteResult` or surface the Host failure. */
async function unwrapRemote<T>(call: () => Promise<RemoteResult<T>>): Promise<T> {
  const result = await call()
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

/**
 * Register the dictionaries and the context-injection settings section.
 * @param ctx - client root context.
 */
export async function apply(ctx: Context): Promise<void> {
  const disposeMount = await ctx.remote.$mount(TYPERT_REMOTE)
  ctx.effect(() => () => disposeMount(), 'claude-compat: remote mount')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-context-injection: dictionaries')
  const t = ctx.locale.bind(NS)
  const mcps = async (): Promise<readonly McpServer[]> => {
    const result = await ctx.remote.pluginInventory.list()
    if (!result.ok) {
      throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`)
    }
    return mapMcpServers(result.value)
  }
  const mcpMgr = (): ClaudeCompatMcpNamespace => {
    const namespace = ctx.get(`remote.${REMOTE_NAMESPACE}`) as ClaudeCompatMcpNamespace | undefined
    if (namespace === undefined) {
      throw new Error(`${REMOTE_NAMESPACE} namespace service is not mounted`)
    }
    return namespace
  }
  const authoring: McpAuthoringActions = {
    addMcp: request => unwrapRemote(() => mcpMgr().addMcp(request)),
    editMcp: request => unwrapRemote(() => mcpMgr().editMcp(request)),
    disableMcp: request => unwrapRemote(() => mcpMgr().disableMcp(request)),
  }
  const controller = new ContextInjectionController(
    ctx.settingsScope.bind<ContextInjectionFlags>({ namespace: CONTEXT_INJECTION_NS }),
    mcps,
    authoring,
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




