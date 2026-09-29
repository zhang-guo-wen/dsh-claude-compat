# dsh-claude-compat

English | [中文](README.zh.md)

## Background: DeepSeek Harness

DeepSeek Harness (`dsh`) is the open-source agent harness from DeepSeek AI, where nearly every capability is a plugin on [Cordis](https://github.com/cordiverse/cordis). It is in **developer preview** and iterating fast, so expect compatibility-breaking changes ([docs](https://deepseek-harness.github.io/deepseek-harness/), `0.1.7-alpha.*`); this plugin is a standalone third-party package that resolves `@deepseek-ai/*` from the running host.

## The problem this plugin solves

Skills, memory files and path-scoped rules kept in the Claude Code `.claude/` layout are invisible to a DSH session; this plugin loads them and can write new memories into Claude's project auto-memory directory. All four capabilities have separate switches in **设置 → Claude 兼容**.

## Screenshots

Screenshots pending — this plugin has no captured UI yet.

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat
```

From the npm registry: <https://www.npmjs.com/package/@guowenzhang/dsh-claude-compat> — restart the host afterwards; local checkouts, git sources and troubleshooting are in [AGENTS.md](AGENTS.md).

## Usage

### Open the settings page

The plugin adds one settings section: **设置 → Claude 兼容**. It has four switches: **加载技能**, **加载记忆**, **写入记忆**, and **加载规则**. The three loading switches are on by default; writing is off by default. Changes take effect in the running plugin by the next request, without restarting the host.

### Load Claude Code skills

**加载技能** adds two roots to the session skill catalog: the project's `<project root>/.claude/skills/**` and the user's `~/.claude/skills/**`. The project root is the nearest ancestor containing `.git`; without one, the working directory is used instead. A skill is `<root>/.claude/skills/<name>/SKILL.md`, or a flat `<name>.md`, carrying `name` and `description` frontmatter. A same-named DSH skill wins a duplicate. Discovery happens when the catalog is listed, so an added, renamed, or deleted skill is picked up on the next discovery rather than immediately.

### Load memory files

**加载记忆** folds the files Claude Code loads, broad to specific, into the request:

| Memory file | Where it comes from | When it folds |
|---|---|---|
| Managed policy | The platform's managed policy `CLAUDE.md` | Session start |
| User | `~/.claude/CLAUDE.md` | Session start |
| Project | `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` in every directory from the project root down to the working directory | Session start |
| Nested | The same three names for a directory under the working directory | The request after the `read` tool touches a file under it |
| Auto memory | `~/.claude/projects/<repository>/memory/MEMORY.md` | Session start; only the index, capped at its first 200 lines or 25 KB |

`@path` imports expand in place, relative to the importing file, up to four hops; a token that names no readable file stays literal, which is what leaves an `@mention` or an email address alone. `CLAUDE.md` and `CLAUDE.local.md` are the two names this plugin takes over: their sections are removed from the host's own workspace-instruction messages, so those files load here, under Claude Code's rules, exactly once. `AGENTS.md` is untouched and keeps loading from the host.

### Write Claude auto memory

**加载记忆** must be on before **写入记忆** can be enabled. Once enabled, the model can call `claude_memory_write`. A call creates a new `<name>.md` topic file under the current project's `~/.claude/projects/<repository>/memory/` and appends a pointer to `MEMORY.md`. The directory follows this plugin's `claudeHome`, `projectRootMarkers`, and `autoMemoryDirectory` settings. Existing topics are never overwritten; names accept only lowercase letters, digits, and hyphens, and writes are refused once the index reaches Claude's loading limit. Turning off **加载记忆** also disables the write tool. The plugin does not summarize or delete old memories automatically.

### Load scoped rules

**加载规则** folds `.claude/rules/**` for the project and `~/.claude/rules/**` for the user. A rule with no `paths:` in its frontmatter is always-on and folds at session start, like `CLAUDE.md`. A rule with a `paths:` glob list is path-scoped: it folds into the request that follows a `read` of a file matching one of its globs, matched against the project-root-relative path, and at most once per session. Reading is the only trigger — `write` and `edit` never activate a scoped rule.

### Know the defaults

| Setting | Default |
|---|---|
| **加载技能** | on — `.claude/skills/**` and `~/.claude/skills/**` are in the catalog |
| **加载记忆** | on — the memory files and the auto-memory index fold at session start |
| **写入记忆** | off — requires **加载记忆**; disabling loading also withdraws `claude_memory_write` |
| **加载规则** | on — always-on rules fold at session start, a `paths:` rule after a matching read |

## Notes and caveats

- **No skill watcher.** `.claude/skills` is discovered when the catalog is listed; an add, rename, or delete is picked up on the next discovery.
- **Memory folds once per session, not after every edit.** The memory files are read when they first enter the request; later edits are not re-read mid-session. A subdirectory's memory is read once, the first time the agent reads a file under it. Compaction is the exception: a memory message it shadowed folds again from disk.
- **A repo with `CLAUDE.md` and no `AGENTS.md` keeps an intro-only reminder.** The host loader's message is kept — minus the sections this plugin owns — so it stays a visible baseline and is not recomposed on every step, which leaves its one-line "the following workspace instructions may be relevant" intro with nothing after it.
- **Nested memory triggers on `read` only.** A nested `CLAUDE.md` folds when the `read` tool touches a file in its directory; `write` and `edit` do not trigger it.
- **Path-scoped rules trigger on `read` only.** `write` and `edit` do not activate them.
- **Writing happens only on a model tool call.** The plugin does not organize, overwrite, or delete memories on its own. A mid-session index write is not automatically folded again in that session.
- **Claude Code's `settings.json` is not consulted.** `autoMemoryDirectory` there is ignored; set the plugin's own `autoMemoryDirectory` field instead.
- **Imports are not approval-gated.** Claude Code asks before a project memory file imports a path outside the working directory; this plugin resolves such an import directly.
- **`AGENTS.md` is not the loader's fallback.** Claude Code's default reads `AGENTS.md` only when no `CLAUDE.md` or `CLAUDE.local.md` exists in the working directory or above it. Here the host's workspace-instruction loader keeps reading `AGENTS.md` on its own terms, alongside the `CLAUDE.md` this plugin loads.

## License

Apache License 2.0 — see [LICENSE](LICENSE). This product includes MIT-licensed portions derived from DeepSeek Harness; see [NOTICE](NOTICE). Not affiliated with or endorsed by Claude Code or its owners.

## Further reading

- [AGENTS.md](AGENTS.md) — install variants, the full field table, the build, deployment and live-update semantics, release steps, and troubleshooting.
- [docs/implementation.md](docs/implementation.md) — the package reference: discovery rules, memory and rule folding, and Model Experience.
- [tests/README.md](tests/README.md) — the spec commands and which suites each one covers.
- [@guowenzhang/dsh-mcp-manager](https://github.com/zhang-guo-wen/dsh-mcp-manager) — the sibling plugin that owns MCP server management (authoring rows, on-demand loading, tool filters); this repository contains no MCP code.
- [DeepSeek Harness documentation](https://deepseek-harness.github.io/deepseek-harness/).
