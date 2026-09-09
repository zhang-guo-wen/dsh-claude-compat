/**
 * Human-facing `/btw` ("by the way") command: forks a continuable child
 * subagent that answers a side question as its own sub-task session.
 *
 * The handler does NOT answer the question in the current session. It forks a
 * continuable subagent on `ctx.subagents` (provider `fork` by default), which
 * inherits the parent session's completed-turn prefix as seed, delivers the
 * question as the child's initial prompt, and records a log-only `btw/spawn`
 * event carrying the child id. The parent session shows only a short "started
 * /btw, child session {id}" acknowledgement; the answer lives in the child
 * sub-task session and is never a model-surface message of the parent.
 *
 * The fork requires a fully balanced history: if the parent session has an
 * in-progress turn (no matching `turn/end`), or has completed no turn at all,
 * the command refuses so the child always inherits a complete prefix.
 *
 * @module @deepseek-ai/dsh-command-btw
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { SessionEventMap } from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session'
// Activate Context.subagents and Context.sessionProjections module augmentations.
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-session-projection'

export const name = 'command-btw'
export const inject = ['commands', 'sessionProjections', 'subagents']

const USAGE = 'Usage: /btw <question>'

/** Deployment policy for one `/btw` fork. */
export interface Config {
  /** Maximum UTF-8 bytes in the side question. */
  maxQuestionBytes?: number
  /** The `ctx.subagents` fork provider name (default `fork`). */
  provider?: string
}

/** Validated immutable deployment policy. */
export interface ResolvedConfig {
  /** Maximum UTF-8 bytes in the side question. */
  maxQuestionBytes: number
  /** The `ctx.subagents` fork provider name. */
  provider: string
}

/** Library default for the optional question byte cap. */
const DEFAULT_MAX_QUESTION_BYTES = 4096

/** Library default for the `ctx.subagents` fork provider name. */
const DEFAULT_PROVIDER = 'fork'

/** Loader field schemas with library defaults. */
export const ConfigFields = {
  maxQuestionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_QUESTION_BYTES),
  provider: z.string().min(1).default(DEFAULT_PROVIDER),
}

/** Loader schema for the `/btw` plugin. */
export const Config: z<Config> = z.object(ConfigFields)

const CONFIG_KEYS: ReadonlySet<string> = new Set([
  'maxQuestionBytes',
  'provider',
])

/** The log-only record of one `/btw` fork dispatch. */
export interface BtwSpawnEventData {
  /** The trimmed side question delivered to the child. */
  question: string
  /** The durable child session id that owns the answer. */
  childId: SessionId
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Log-only record that a `/btw` command forked a continuable child subagent
     * and delivered `question` to it. The answer lives in `childId`. The parent
     * session publishes no model-surface message for the exchange.
     */
    'btw/spawn': BtwSpawnEventData
  }
}

/**
 * Validate and detach required `/btw` configuration.
 * @param config - untrusted plugin configuration.
 * @returns immutable policy with library defaults applied.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const candidate: unknown = config
  if (candidate === null || typeof candidate !== 'object') {
    throw new Error('command-btw: configuration is required')
  }
  const value = candidate as Config
  for (const key of Object.keys(value)) {
    if (!CONFIG_KEYS.has(key)) throw new Error(`command-btw: unknown config key "${key}"`)
  }
  const maxQuestionBytes = value.maxQuestionBytes ?? DEFAULT_MAX_QUESTION_BYTES
  if (!Number.isSafeInteger(maxQuestionBytes) || maxQuestionBytes <= 0) {
    throw new Error('command-btw: maxQuestionBytes must be a positive integer')
  }
  const provider = value.provider ?? DEFAULT_PROVIDER
  if (typeof provider !== 'string' || provider.length === 0) {
    throw new Error('command-btw: provider must be a non-empty string')
  }
  return Object.freeze({ maxQuestionBytes, provider })
}

/**
 * Whether the session is unsuitable to fork from: either a turn is still open
 * (`turn/start` without a matching `turn/end`) or no turn has ever completed
 * (`lastTurn` is 0). Under the strict balanced-history requirement a fork is
 * refused in both cases, so the child always inherits a complete, closed
 * prefix.
 * @param session - the session to inspect.
 * @param ctx - context exposing the `turnBoundary` projection.
 * @returns a human-readable reason, or undefined when the history is balanced.
 */
function unbalancedForkReason(
  ctx: Context,
  session: Parameters<typeof ctx.sessionProjections.stateOf>[0],
): string | undefined {
  const state = ctx.sessionProjections.stateOf(session, 'turnBoundary')
  if (state === undefined) return undefined
  if (state.openTurnStartSeq !== null) {
    return '/btw requires a balanced history; wait for the current turn to finish before forking a side question.'
  }
  if (state.lastTurn === 0) {
    return '/btw requires at least one completed turn to fork from; finish a turn first.'
  }
  return undefined
}

/**
 * Fork one `/btw` question as a continuable child subagent.
 *
 * The handler refuses empty or oversized questions, an in-progress parent
 * turn, and a session with no completed turn, so the child always inherits a
 * fully balanced prefix. It then calls `ctx.subagents.startContinuable` on the
 * configured fork provider, records a log-only `btw/spawn` event with the
 * child id, and returns a short acknowledgement. The answer and any follow-up
 * conversation live in the child session.
 * @param ctx - context exposing the commands, subagents, and projection services.
 * @param config - validated deployment policy.
 * @param invocation - receiving agent, raw command input, and UI cancellation.
 * @returns the settled command result.
 */
async function forkBtw(
  ctx: Context,
  config: ResolvedConfig,
  invocation: CommandInvocation,
): Promise<CommandResult> {
  const question = invocation.rawInput.trim()
  if (question.length === 0) {
    return { kind: 'error', text: `A question is required. ${USAGE}` }
  }
  if (Buffer.byteLength(question, 'utf8') > config.maxQuestionBytes) {
    return { kind: 'error', text: `The question exceeds the ${config.maxQuestionBytes}-byte limit.` }
  }
  const session = invocation.agent.session
  const unbalanced = unbalancedForkReason(ctx, session)
  if (unbalanced !== undefined) {
    return { kind: 'error', text: unbalanced }
  }
  const provider = ctx.subagents.getProvider(config.provider)
  if (provider === undefined) {
    return { kind: 'error', text: `/btw is unavailable: no "${config.provider}" subagent provider is registered.` }
  }
  if (provider.prepareContinuable === undefined) {
    return { kind: 'error', text: `/btw is unavailable: the "${config.provider}" provider cannot create continuable children.` }
  }
  const label = `btw: ${question.slice(0, 80)}`
  const started = await ctx.subagents.startContinuable({
    provider: config.provider,
    label,
    request: {
      prompt: [{ type: 'text', text: `Answer this side question from the parent context: ${question}` }],
      parent: invocation.agent,
    },
    signal: invocation.signal,
  })
  invocation.agent.session.append('btw/spawn', {
    question,
    childId: started.childId,
  } satisfies SessionEventMap['btw/spawn'])
  return {
    kind: 'success',
    text: `Started /btw as child session ${started.childId}. The answer and any follow-up live there.`,
  }
}

/** Register the global `/btw` command for every composed command adapter. */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = resolveConfig(config)
  ctx.commands.register({
    name: 'btw',
    description: 'by the way: fork a child subagent to answer a side question',
    input: { hint: '<question>' },
    recordInput: false,
    handler: invocation => forkBtw(ctx, resolved, invocation),
  })
}
