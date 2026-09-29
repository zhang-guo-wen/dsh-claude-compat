/** Write one topic file and its index pointer in Claude Code's auto-memory directory. */
import { appendFile, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { AUTO_MEMORY_INDEX_BYTES, AUTO_MEMORY_INDEX_LINES, resolveAutoMemoryDirectory, type MemoryConfig } from './memory.ts'

declare module '@deepseek-ai/cordis' {
  interface Events {
    /** Loader has committed live config fields into this plugin's fiber. */
    'loader/volatile-update'(paths: readonly (readonly string[])[]): void
  }
}

export const CLAUDE_MEMORY_WRITE_TOOL = 'claude_memory_write'
const MAX_TOPIC_BYTES = 1_048_576
const MAX_INDEX_BYTES = 1_048_576
const queues = new Map<string, Promise<void>>()

export interface ClaudeMemoryWrite {
  name: string
  title: string
  summary: string
  content: string
}

/** Create a new topic and put its pointer within the portion of MEMORY.md Claude loads. */
export async function writeClaudeMemory(directory: string, entry: ClaudeMemoryWrite): Promise<string> {
  if (entry.name === 'memory' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.name)) {
    throw new Error('Memory name must be 1–64 lowercase letters, digits, or hyphens, starting with a letter or digit.')
  }
  const title = oneLine(entry.title, 80, 'title')
  const summary = oneLine(entry.summary, 100, 'summary')
  if (entry.content.trim().length === 0 || Buffer.byteLength(entry.content, 'utf8') > MAX_TOPIC_BYTES) {
    throw new Error(`Memory content must be nonempty and at most ${MAX_TOPIC_BYTES} UTF-8 bytes.`)
  }
  const filename = `${entry.name}.md`
  const pointer = `- [${title.replace(/[\[\]]/g, '')}](${filename}) — ${summary}`
  return await serial(directory, async () => {
    const indexPath = join(directory, 'MEMORY.md')
    const topicPath = join(directory, filename)
    await mkdir(directory, { recursive: true })
    const info = await lstat(indexPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    if (info?.isSymbolicLink()) throw new Error('MEMORY.md must not be a symbolic link.')
    if (info !== undefined && (!info.isFile() || info.size > MAX_INDEX_BYTES)) {
      throw new Error('MEMORY.md is not a regular file or exceeds the 1 MiB limit.')
    }
    const existing = info === undefined ? '' : await readFile(indexPath, 'utf8')
    const addition = `${existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''}${pointer}\n`
    const visible = existing + addition
    if (Buffer.byteLength(visible, 'utf8') > Math.min(MAX_INDEX_BYTES, AUTO_MEMORY_INDEX_BYTES)
      || visible.split('\n').length - 1 > AUTO_MEMORY_INDEX_LINES) {
      throw new Error('MEMORY.md has reached Claude Code’s loaded index limit; shorten the index before adding a memory.')
    }
    await writeFile(topicPath, entry.content, { encoding: 'utf8', flag: 'wx' })
    try {
      await appendFile(indexPath, addition, 'utf8')
    } catch (error) {
      await rm(topicPath, { force: true })
      throw error
    }
    return `Saved ${filename} and added its pointer to MEMORY.md.`
  })
}

function oneLine(value: string, maximum: number, field: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maximum || /[\r\n]/.test(trimmed)) {
    throw new Error(`Memory ${field} must be one nonempty line of at most ${maximum} characters.`)
  }
  return trimmed
}

async function serial<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>(resolve => { release = resolve })
  queues.set(key, current)
  await previous
  try {
    return await action()
  } finally {
    release()
    if (queues.get(key) === current) queues.delete(key)
  }
}

/** Keep the tool registry in sync with the independent live write switch. */
export function registerClaudeMemoryWriteTool(ctx: Context, config: MemoryConfig, enabled: () => boolean): void {
  let withdraw: (() => void) | undefined
  const sync = (): void => {
    if (enabled() && withdraw === undefined) withdraw = ctx.tools.register(defineTool({
      name: CLAUDE_MEMORY_WRITE_TOOL,
      description: 'Save a new persistent memory to Claude Code’s own project memory directory. Creates a topic file and adds a pointer to MEMORY.md. Use when the user asks you to remember something. Existing topics are never overwritten.',
      parameters: {
        name: { type: 'string', required: true, description: 'Unique lowercase filename stem, using letters, digits, and hyphens.' },
        title: { type: 'string', required: true, description: 'Short title shown in the memory index.' },
        summary: { type: 'string', required: true, description: 'One-line reminder of what the topic contains.' },
        content: { type: 'string', required: true, description: 'Full Markdown content of the new memory topic.' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { message: { type: 'string', required: true } } },
        render: (_args, value) => [{ type: 'text', text: value.message }],
      },
      async execute(args, exec) {
        if (!enabled()) return { message: 'Claude memory writing is disabled.' }
        exec.signal.throwIfAborted()
        const cwd = exec.agent?.session?.header?.cwd
        if (cwd === undefined) return { message: 'Claude memory writing requires a session working directory.' }
        const directory = await resolveAutoMemoryDirectory(cwd, ctx, config)
        exec.signal.throwIfAborted()
        try {
          return { message: await writeClaudeMemory(directory, args) }
        } catch (error) {
          return { message: `Could not save Claude memory: ${error instanceof Error ? error.message : String(error)}` }
        }
      },
    }))
    if (!enabled() && withdraw !== undefined) {
      withdraw()
      withdraw = undefined
    }
  }
  sync()
  ctx.on('loader/volatile-update', paths => {
    if (paths.some(path => path[0] === 'memoryWrite' || path[0] === 'memory')) sync()
  })
  ctx.effect(() => () => { withdraw?.() }, 'claude-compat: memory write tool lifetime')
}
