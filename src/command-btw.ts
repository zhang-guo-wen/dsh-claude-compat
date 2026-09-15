/**
 * Human-facing `/btw` ("by the way") command: forks the receiving session into
 * a continuation Session that answers a side question.
 *
 * The handler does NOT answer the question in the receiving session. It calls
 * `sessionController.fork()` on that session, which cuts a new Session at the
 * last completed turn, and then `sessionController.prompt()` to deliver the
 * question to the new Session. That Session is an ordinary session: it inherits
 * the parent's completed-turn prefix as its own log, appears in the session
 * list, and can be continued or archived like any other. The answer and any
 * follow-up conversation live there, never as a model-surface message of the
 * receiving session.
 *
 * The dispatch is recorded through the command executor's own lifecycle:
 * `command/run` carries the question (`recordInput: true`) and `command/done`
 * carries the acknowledgement naming the forked session id. The command writes
 * no plugin-owned session event type, so a reader that does not compose this
 * plugin still accepts the log.
 *
 * The fork requires at least one completed turn: with none, the new Session
 * would inherit no context. An in-progress turn does NOT refuse: the fork is
 * anchored at the last completed turn, so a side question asked mid-turn forks
 * from the last closed turn.
 *
 * @module @deepseek-ai/dsh-command-btw
 */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { SessionController, SessionForkValue, SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller'
// Activate Context.sessionProjections module augmentation.
import type {} from '@deepseek-ai/dsh-session-projection'
import { startedText } from './btw-receipt.ts'

export const name = 'command-btw'
export const inject = ['commands', 'sessionProjections']

const USAGE = 'Usage: /btw <question>'

/** The `ctx` service that forks and prompts sessions. */
const SESSION_CONTROLLER = 'sessionController'

/** Deployment policy for one `/btw` fork. */
export interface Config {
  /** Maximum UTF-8 bytes in the side question. */
  maxQuestionBytes?: number
}

/** Validated immutable deployment policy. */
export interface ResolvedConfig {
  /** Maximum UTF-8 bytes in the side question. */
  maxQuestionBytes: number
}

/** Library default for the optional question byte cap. */
const DEFAULT_MAX_QUESTION_BYTES = 4096

/** Loader field schemas with library defaults. */
export const ConfigFields = {
  maxQuestionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_QUESTION_BYTES),
}

/** Loader schema for the `/btw` plugin. */
export const Config: z<Config> = z.object(ConfigFields)

const CONFIG_KEYS: ReadonlySet<string> = new Set(['maxQuestionBytes'])

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
  return Object.freeze({ maxQuestionBytes })
}

/** The message the forked Session receives as its first prompt. */
function promptFor(question: string): string {
  return `Answer this side question from the forked session context: ${question}`
}

/**
 * Whether the session is unsuitable to fork from: no turn has completed, so the
 * new Session would inherit no context. A currently open turn is not by itself a
 * refusal, because the fork is anchored at the last completed turn; an open
 * FIRST turn (`turn/start` at seq 0) leaves that anchor missing.
 * @param session - the session to inspect.
 * @param ctx - context exposing the `turnBoundary` projection.
 * @returns a human-readable reason, or undefined when the session can fork.
 */
function forkRefusalReason(
  ctx: Context,
  session: Parameters<typeof ctx.sessionProjections.stateOf>[0],
): string | undefined {
  const state = ctx.sessionProjections.stateOf(session, 'turnBoundary')
  if (state === undefined) return undefined
  const firstTurnIsOpen = state.openTurnStartSeq === 0
  if (state.lastTurn === 0 || firstTurnIsOpen) {
    return '/btw requires at least one completed turn to fork from; finish a turn first.'
  }
  return undefined
}

/** Render one thrown `/btw` failure as the command's error text. */
function failureText(stage: string, error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `/btw ${stage} failed: ${detail}`
}

/**
 * Fork one `/btw` question into a continuation Session.
 *
 * The handler refuses empty or oversized questions, a session with no completed
 * turn, and a profile with no session controller. It then forks the receiving
 * session and delivers the question to the new session, returning an
 * acknowledgement naming it.
 * @param ctx - context exposing the commands, session controller, and projection services.
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
  const refusal = forkRefusalReason(ctx, session)
  if (refusal !== undefined) {
    return { kind: 'error', text: refusal }
  }
  const controller = ctx.get(SESSION_CONTROLLER) as SessionController | undefined
  if (controller === undefined) {
    return {
      kind: 'error',
      text: `/btw is unavailable: this profile composes no "${SESSION_CONTROLLER}" service.`,
    }
  }
  let forked: SessionForkValue
  try {
    forked = await controller.fork({ sessionId: session.id })
  } catch (error: unknown) {
    return { kind: 'error', text: failureText('fork', error) }
  }
  try {
    // The Remote-facing signature carries a cancellation signal; the in-process
    // host implementation reads only `request`, so nothing drains this signal.
    await controller.prompt({
      requestId: randomUUID() as SessionPromptRequest['requestId'],
      sessionId: forked.sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: promptFor(question) }],
    }, new AbortController().signal)
  } catch (error: unknown) {
    return { kind: 'error', text: failureText('prompt', error) }
  }
  return {
    kind: 'success',
    text: startedText(forked.sessionId),
  }
}

/**
 * Register the global `/btw` command for every composed command adapter.
 *
 * `recordInput: true` keeps the accepted question in the executor's own
 * `command/run` record, so the dispatch is durable without a plugin-owned event
 * type. The question is command input, never a model-surface message.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = resolveConfig(config)
  ctx.commands.register({
    name: 'btw',
    description: 'by the way: fork a session to answer a side question',
    input: { hint: '<question>' },
    recordInput: true,
    handler: invocation => forkBtw(ctx, resolved, invocation),
  })
}
