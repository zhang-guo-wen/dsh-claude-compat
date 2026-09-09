/** Plain HTTP route for MCP authoring: the browser settings page POSTs add/edit/disable. */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { ClaudeCompatMcp } from './mcp-remote.ts'
import type { AddMcpRequest, DisableMcpRequest, EditMcpRequest } from './types.ts'

const ROUTE_PATH = '/api/claude-compat/mcp'
const MAX_BODY = 1_000_000

async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      if (data.length > MAX_BODY) {
        reject(new Error('request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

/**
 * Register one exact HTTP route that mutates MCP rows in the global or a user
 * agent-preset composition. Reuses the ClaudeCompatMcp authoring (mcp-authoring).
 * No-op when the Loader or WebServer service is absent (e.g. headless).
 * @param ctx - host context with an optional `loader` and `webServer`.
 */
export function registerMcpHttpRoute(ctx: Context): void {
  if (ctx.get('loader') === undefined || ctx.get('webServer') === undefined) return
  const webServer = ctx.get('webServer') as { register(route: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void }
  const mcp = new ClaudeCompatMcp(ctx)
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body: unknown
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' })
        return
      }
      const { action, ...request } = body as { action: string } & Record<string, unknown>
      try {
        let result
        if (action === 'add') result = await mcp.addMcp(request as AddMcpRequest)
        else if (action === 'edit') result = await mcp.editMcp(request as EditMcpRequest)
        else if (action === 'disable') result = await mcp.disableMcp(request as DisableMcpRequest)
        else { sendJson(res, 400, { ok: false, error: `unknown action: ${action}` }); return }
        sendJson(res, 200, { ok: true, result })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), `claude-compat: ${ROUTE_PATH}`)
}
