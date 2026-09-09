import { describe, expect, it } from 'vitest'
import {
  assertServerName,
  mcpEntryConfig,
  specFromEntryConfig,
} from '../src/mcp-config.ts'

describe('mcp-config', () => {
  it('converts a stdio spec with a description', () => {
    const config = mcpEntryConfig(
      { type: 'stdio', command: 'cmd', args: ['/c', 'npx', '-y', '@upstash/context7-mcp'] },
      'context7',
      'Context7 MCP',
    )
    expect(config).toEqual({
      transport: 'stdio', serverName: 'context7', command: 'cmd',
      args: ['/c', 'npx', '-y', '@upstash/context7-mcp'], env: {}, cwd: '', description: 'Context7 MCP',
    })
  })

  it('maps http and sse specs onto the streamable-http config', () => {
    expect(mcpEntryConfig({ type: 'http', url: 'https://x/mcp', headers: { a: 'b' } }, 'http1', '').transport)
      .toBe('streamable-http')
    const config = mcpEntryConfig({ type: 'sse', url: 'https://x/mcp' }, 'sse1', '')
    expect(config).toEqual({ transport: 'streamable-http', serverName: 'sse1', url: 'https://x/mcp', headers: {} })
  })

  it('rejects a stdio spec without a command', () => {
    expect(() => mcpEntryConfig({ type: 'stdio' }, 'x', '')).toThrow(/command/)
  })

  it('rejects a http spec without a url', () => {
    expect(() => mcpEntryConfig({ type: 'http' }, 'x', '')).toThrow(/url/)
  })

  it('rejects an unknown transport type', () => {
    expect(() => mcpEntryConfig({ type: 'voodoo' as never }, 'x', '')).toThrow(/Unknown MCP transport type/)
  })

  it('validates the server-name namespace', () => {
    expect(assertServerName('context7')).toBe('context7')
    expect(() => assertServerName('bad name!')).toThrow(/serverName/)
    expect(() => mcpEntryConfig({ type: 'stdio', command: 'c' }, 'has space', '')).toThrow(/serverName/)
  })

  it('round-trips a stored config back to the form spec', () => {
    const config = mcpEntryConfig({ type: 'stdio', command: 'cmd', args: ['a'] }, 'x', 'd')
    expect(specFromEntryConfig(config)).toEqual({ type: 'stdio', command: 'cmd', args: ['a'], env: {}, cwd: '' })
    const http = mcpEntryConfig({ type: 'http', url: 'https://y', headers: {} }, 'y', '')
    expect(specFromEntryConfig(http)).toEqual({ type: 'streamable-http', url: 'https://y', headers: {} })
  })
})
