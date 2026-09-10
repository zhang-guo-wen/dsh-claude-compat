/**
 * Typert Remote contribution for the `claudeCompatMcp` namespace.
 *
 * Mirror of the artifact `@deepseek-ai/dsh-typert-generator` emits for a Host
 * Remote owner: the browser half mounts it with `ctx.remote.$mount`, which
 * installs a `remote.claudeCompatMcp` service exposing add/edit/disable. The
 * codecs are permissive (`parse` passes any value through) because the Host
 * gateway re-derives its own descriptor from the service method signature
 * (`packages/api/gateway` `srcDescriptor`) and validates there; the Client only
 * needs a strict-shaped codec so `$mount` accepts the contribution.
 * @module @zhang-guo-wen/dsh-claude-compat/remote
 */

import type {
  InvocationDescriptor,
  TypertCodec,
  TypertRemoteContribution,
  TypertSchema,
} from '@deepseek-ai/dsh-typert-protocol'

/** Wire namespace and Cordis service key of the MCP authoring owner. */
export const REMOTE_NAMESPACE = 'claudeCompatMcp'

/** Permissive strict codec: accepts any value, returns it unchanged. */
const passthrough: TypertSchema<unknown> = { parse: value => value }

function codec(typeSymbol: string): TypertCodec {
  return { mode: 'strict', typeSymbol, schema: passthrough }
}

function descriptor(method: string): InvocationDescriptor {
  const endpoint = `${REMOTE_NAMESPACE}/${method}`
  const owner = `@zhang-guo-wen/dsh-claude-compat#${endpoint}`
  return {
    id: owner,
    service: REMOTE_NAMESPACE,
    namespace: REMOTE_NAMESPACE,
    method,
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'request',
        wire: 'request',
        source: 'json',
        codec: codec(`${owner}:request`),
      },
    ],
    result: codec(`${owner}:result`),
  }
}

/** Contribution mounted by the browser half to reach the MCP authoring owner. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: '@zhang-guo-wen/dsh-claude-compat',
  descriptors: [
    descriptor('addMcp'),
    descriptor('editMcp'),
    descriptor('disableMcp'),
    descriptor('describeMcp'),
    descriptor('gateState'),
  ],
}
