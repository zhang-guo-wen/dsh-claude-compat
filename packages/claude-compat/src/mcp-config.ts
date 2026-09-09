/**
 * MCP config authoring helpers: convert the settings form's JSON spec
 * (Claude Code-style `type`/`command`/`args`) into the `mcp-client` Config
 * shape, and back, so the roster and the edit form share one form. The spec is
 * validated strictly — a malformed or unknown-transport spec is refused before
 * it reaches a composition file.
 * @module @deepseek-ai/dsh-claude-compat/mcp-config
 */

/** mcp-client `serverName` namespace pattern (`mcp__<serverName>__<rawName>`). */
export const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** A Claude Code-style MCP server definition accepted from the settings form. */
export interface McpSpec {
  /** Transport kind; `http` and `sse` both map to mcp-client `streamable-http`. */
  type: 'stdio' | 'streamable-http' | 'http' | 'sse'
  /** Child-process executable for a stdio server. */
  command?: string
  /** Arguments passed directly, without shell interpolation. */
  args?: string[]
  /** Extra env vars for a stdio server. */
  env?: Record<string, string>
  /** Working directory for a stdio server. */
  cwd?: string
  /** MCP endpoint URL for an HTTP server. */
  url?: string
  /** Additional headers for an HTTP server. */
  headers?: Record<string, string>
}

/** The normalized transport fragment the mcp-client Config consumes. */
export type McpTransportConfig =
  | { transport: 'stdio'; command: string; args: string[]; env: Record<string, string>; cwd: string }
  | { transport: 'streamable-http'; url: string; headers: Record<string, string> }

/** The full config written into an mcp-client entry. */
export type McpEntryConfig = McpTransportConfig & {
  serverName: string
  description?: string
}

/**
 * Validate a server-name string.
 * @param serverName - candidate server namespace.
 * @returns the value when valid.
 * @throws when it does not match the mcp-client namespace pattern.
 */
export function assertServerName(serverName: string): string {
  if (!MCP_SERVER_NAME_PATTERN.test(serverName)) {
    throw new Error(`MCP serverName must match ${String(MCP_SERVER_NAME_PATTERN)}`)
  }
  return serverName
}

/**
 * Convert a form spec + identity into the mcp-client entry config.
 * @param spec - the user-supplied JSON spec.
 * @param serverName - the server namespace (unique per entry).
 * @param description - optional author metadata.
 * @returns the mcp-client config shape.
 * @throws when the spec is malformed or the transport fragment is incomplete.
 */
export function mcpEntryConfig(spec: McpSpec, serverName: string, description: string): McpEntryConfig {
  assertServerName(serverName)
  if (spec.type === 'stdio') {
    if (typeof spec.command !== 'string' || spec.command.length === 0) {
      throw new Error('MCP stdio spec requires a command string')
    }
    return {
      transport: 'stdio',
      serverName,
      command: spec.command,
      args: spec.args ?? [],
      env: spec.env ?? {},
      cwd: spec.cwd ?? '',
      ...description === '' ? {} : { description },
    }
  }
  // `http` and `sse` both connect over the streamable-http transport.
  if (spec.type === 'http' || spec.type === 'sse' || spec.type === 'streamable-http') {
    if (typeof spec.url !== 'string' || spec.url.length === 0) {
      throw new Error('MCP http spec requires a url')
    }
    return {
      transport: 'streamable-http',
      serverName,
      url: spec.url,
      headers: spec.headers ?? {},
      ...description === '' ? {} : { description },
    }
  }
  throw new Error(`Unknown MCP transport type: ${String((spec as { type: unknown }).type)}`)
}

/**
 * Reverse a stored entry config into the form spec (for editing).
 * @param config - the mcp-client config read from an entry.
 * @returns the Claude Code-style spec the edit form edits.
 */
export function specFromEntryConfig(config: McpEntryConfig): McpSpec {
  if (config.transport === 'stdio') {
    return { type: 'stdio', command: config.command, args: config.args, env: config.env, cwd: config.cwd }
  }
  return { type: 'streamable-http', url: config.url, headers: config.headers }
}
