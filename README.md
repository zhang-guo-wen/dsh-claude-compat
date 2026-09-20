# dsh-claude-compat

English | [中文](README.zh.md)

A standalone plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that loads your
existing **Claude Code** skills, memory files, and scoped rules into a session, with a **Claude 兼容** settings page
whose three switches turn each part of that surface on or off independently.

It does not bundle `@deepseek-ai/*`; those resolve from the host harness at runtime.

## What it does

- **Skills.** Discovers `<project root>/.claude/skills/**` and `~/.claude/skills/**` into the session skill catalog,
  so the model can invoke a Claude skill by name next to DSH's own.
- **Memory files.** Loads the files Claude Code loads — the machine-wide managed policy `CLAUDE.md`,
  `~/.claude/CLAUDE.md`, and, from the project root down to the working directory, every `CLAUDE.md`,
  `.claude/CLAUDE.md`, and `CLAUDE.local.md` — plus the auto-memory index
  `~/.claude/projects/<project>/memory/MEMORY.md`, expanding `@path` imports up to four hops. It owns the
  `CLAUDE.md` and `CLAUDE.local.md` names outright: the Harness workspace-instruction loader's sections for them
  are stripped from every request, so those files load here, under Claude Code's rules, exactly once.
- **Scoped rules.** Folds `.claude/rules/**` and `~/.claude/rules/**`; a rule with `paths:` frontmatter activates once
  you read a file matching its globs.
- **Settings page.** One switch per part of the surface — skills, memory, rules — each listing what it loads and when.

MCP server management — authoring rows, on-demand loading, and tool filters — is its own plugin,
[`@zhang-guo-wen/dsh-mcp-manager`](https://github.com/zhang-guo-wen/dsh-mcp-manager).

## Install

The built `lib/` is committed, so the repository installs and runs directly — no build step on your machine.

```sh
# over HTTPS
npx @deepseek-ai/dsh plugin --profile web add git+https://github.com/zhang-guo-wen/dsh-claude-compat.git

# or over SSH
npx @deepseek-ai/dsh plugin --profile web add git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git
```

Pin a release tag so a later work-in-progress commit on the default branch is not picked up:

```sh
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v0.2.0"
```

To develop against a local checkout, install the directory. pnpm creates a **symlink**, so a rebuilt `lib/` reaches
the host on the next start with no reinstall:

```sh
npx @deepseek-ai/dsh plugin --profile web add /absolute/path/to/dsh-claude-compat
```

Then restart the host and open the settings page:

```sh
npx @deepseek-ai/dsh web
```

You do not edit the profile manifest by hand: `dsh plugin add` adds both the dependency and the bundle entry.
Remove it, dependency and layer together, with `dsh plugin --profile web remove @zhang-guo-wen/dsh-claude-compat`.

## Configuration

Every field has a working default; the table is for overriding one. `skills`, `rules`, and `memory` also have a
settings-page switch each.

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `claude-code` | Unique provider name registered on `ctx.skills` |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`, `$CLAUDE_HOME`, or `~/.claude` | Claude Code home, scanned for `skills`, `CLAUDE.md`, and `projects` |
| `projectRootMarkers` | `['.git']` | Directory entries that identify the project root |
| `skills` | `true` | Add `.claude/skills` roots to the session skill catalog |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | Scan the project / user `.claude/skills` root |
| `memory` | `true` | Fold the Claude Code memory files into the request |
| `includeProjectRule` / `includeGlobalRule` | `true` | Load the project / user `CLAUDE.md` memory file |
| `includeManagedMemory` | `true` | Load the machine-wide managed policy memory file |
| `managedMemoryPath` | platform policy path | Managed policy memory file to load |
| `includeNestedMemory` | `true` | Load a directory's `.claude/CLAUDE.md` after a read under it |
| `includeAutoMemory` | `true` | Load the auto-memory index `MEMORY.md` |
| `autoMemoryDirectory` | derived from the repository | Auto-memory directory to load instead |
| `takeOverClaudeMd` | `true` | Own `CLAUDE.md`/`CLAUDE.local.md`: load them here and strip them from the workspace-instruction loader |
| `maxMemorySourceBytes` | `4194304` | Maximum UTF-8 bytes read from one memory file |
| `maxMemoryRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one memory batch |
| `maxImportDepth` | `4` | Maximum `@path` import hops followed from one memory file |
| `rules` | `true` | Fold `.claude/rules/**` scoped rules into the request |
| `includeProjectRules` / `includeGlobalRules` | `true` | Fold the project / user `.claude/rules/**` tree |
| `maxRuleSourceBytes` | `1048576` | Maximum UTF-8 bytes read from one rule file |
| `maxRuleRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one rules batch |

```yaml
- name: '@zhang-guo-wen/dsh-claude-compat'
  config:
    skills: true
    memory: true
    rules: false
```

## Known limitations

- **No skill watcher** — `.claude/skills` is discovered when the catalog is listed; an add, rename, or delete is picked
  up on the next discovery.
- **Memory folds once per session, not after every edit** — the memory files are read when they first enter the
  request; later edits are not re-read mid-session. A subdirectory's memory is read once, the first time the agent
  reads a file under it. Compaction is the exception: a memory message it shadowed folds again from disk.
- **The takeover reads the workspace loader's message format** — removing the owned sections relies on the
  `Instructions from:` / `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:`
  headings that loader writes. If that format changes, the sections stop being removed and both loaders inject the
  same file; the composition specs in `tests/rules-composition.spec.ts` fail when that happens.
- **A repo with `CLAUDE.md` and no `AGENTS.md` keeps an intro-only reminder** — the loader's message is kept (minus
  the owned sections) so it stays a visible baseline and is not recomposed on every step, which leaves its one-line
  "the following workspace instructions may be relevant" intro with nothing after it.
- **Nested memory triggers on `read` only** — a nested `CLAUDE.md` folds when the `read` tool touches a file in its
  directory; `write` and `edit` do not trigger it.
- **Path-scoped rules trigger on `read` only** — `write` and `edit` do not activate them.
- **Auto memory is read, never written** — `MEMORY.md` and its topic files reach the model as context, but the harness
  does not append new memories to them the way Claude Code does.
- **Claude Code's `settings.json` is not consulted** — `autoMemoryDirectory` there is ignored; set the plugin's own
  `autoMemoryDirectory` field instead.
- **Imports are not approval-gated** — Claude Code asks before a project memory file imports a path outside the working
  directory; this plugin resolves such an import directly.
- **`AGENTS.md` is not the loader's fallback** — Claude Code's default reads `AGENTS.md` only when no `CLAUDE.md` or
  `CLAUDE.local.md` exists in the working directory or above it. Here the workspace-instruction loader keeps reading
  `AGENTS.md` on its own terms, alongside the `CLAUDE.md` this plugin loads.

## Development

[AGENTS.md](AGENTS.md) owns the build, the Cordis plugin contract, and the pitfalls.

```sh
npm run build      # host (tsdown) + client (rolldown ModuleLoader handoff)
npm run typecheck
```

The specs run on the Harness checkout's `vitest` binary; [tests/README.md](tests/README.md) lists the command and which
suites currently execute.

## License

Apache License 2.0 — see [LICENSE](LICENSE). This product includes MIT-licensed portions derived from DeepSeek
Harness; see [NOTICE](NOTICE). Not affiliated with or endorsed by Claude Code or its owners.
