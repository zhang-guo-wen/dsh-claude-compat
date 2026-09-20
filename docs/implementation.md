---
description: "Claude Code compatibility for the DeepSeek Harness: .claude/skills discovery, CLAUDE.md memory files, and scoped rules."
kind: "package-reference"
---

# @zhang-guo-wen/dsh-claude-compat

English | [中文](implementation.zh.md)

> Package reference. For what this plugin does, see the
> [repository README](../README.md).

## Summary

Claude Code keeps skills as `<root>/.claude/skills/<name>/SKILL.md`, memory in `CLAUDE.md` files and an auto-memory index, and scoped rules as markdown files under `.claude/rules/**`. This package makes the harness read all three. It registers one more skill provider on the shared registry (`dsh-skill`) so `.claude/skills` appears in the session catalog next to DSH's own roots; it loads every memory file Claude Code loads — including the `CLAUDE.md` and `CLAUDE.local.md` names, which the Harness workspace-instruction loader also claims, so their sections are removed from that loader's messages; and it folds `.claude/rules/**` — a `paths:`-scoped rule when a matching file is read, otherwise at the first request.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin alongside the skill registry; it requires `ctx.skills`. A profile `patch` or a preset composition inserts it like any other plugin.

```yaml
- name: '@deepseek-ai/dsh-skill'
- name: '@deepseek-ai/dsh-claude-compat'
```

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `claude-code` | Unique provider name registered on `ctx.skills` |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`, `$CLAUDE_HOME`, or `~/.claude` | Claude Code home; scanned for `skills`, `CLAUDE.md`, and `projects` |
| `projectRootMarkers` | `['.git']` | Directory entries that identify the project root |
| `skills` | `true` | Add `.claude/skills` roots to the session skill catalog |
| `includeProjectRoot` | `true` | Scan the project `.claude/skills` root |
| `includeGlobalRoot` | `true` | Scan the user `~/.claude/skills` root |
| `memory` | `true` | Fold the Claude Code memory files into the request |
| `includeProjectRule` | `true` | Load the project `CLAUDE.md` chain |
| `includeGlobalRule` | `true` | Load the user `~/.claude/CLAUDE.md` |
| `includeNestedMemory` | `true` | Load a directory's memory files after a read under it |
| `includeManagedMemory` | `true` | Load the managed policy memory file |
| `managedMemoryPath` | platform policy path | Managed policy memory file to load |
| `includeAutoMemory` | `true` | Load the auto-memory index `MEMORY.md` |
| `autoMemoryDirectory` | derived from the repository | Auto-memory directory to load instead |
| `takeOverClaudeMd` | `true` | Own `CLAUDE.md`/`CLAUDE.local.md`; false leaves them to the workspace-instruction loader |
| `maxMemorySourceBytes` | `4194304` | Maximum UTF-8 bytes read from one memory file |
| `maxMemoryRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one memory batch |
| `maxImportDepth` | `4` | Maximum `@path` import hops followed from one memory file |
| `rules` | `true` | Fold `.claude/rules/**` scoped rules into the request |
| `includeProjectRules` | `true` | Fold the project `.claude/rules/**` tree |
| `includeGlobalRules` | `true` | Fold the user `~/.claude/rules/**` tree |
| `maxRuleSourceBytes` | `1048576` | Maximum UTF-8 bytes read from one rule file |
| `maxRuleRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one rules batch |

`skills`, `memory`, and `rules` each have a settings-page switch, so a user can turn one part of the surface off
without touching the composition.

### Skills

| Rank | Source | Path |
|---|---|---|
| 250 | `project-claude` | `<projectRoot>/.claude/skills` |
| 550 | `user-claude` | `~/.claude/skills` |

The project root is the nearest ancestor containing `.git`; without one the current cwd is used. Candidates carry a lower rank than DSH's own project roots, so a same-name DSH skill wins a duplicate. A skill is `<root>/.claude/skills/<name>/SKILL.md` (or a flat `<name>.md`) with YAML frontmatter: required `name` and `description`, plus optional `whenToUse`, `metadata`, `disable-model-invocation`, and `user-invocable`.

### Memory Files

Claude Code's memory files are loaded broad to specific, and this package keeps that order:

| Scope | Location | When it folds |
|---|---|---|
| Managed policy | Windows `C:\Program Files\ClaudeCode\CLAUDE.md`, macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, otherwise `/etc/claude-code/CLAUDE.md` | First request |
| User | `~/.claude/CLAUDE.md` | First request |
| Project | `<dir>/CLAUDE.md`, `<dir>/.claude/CLAUDE.md`, then `<dir>/CLAUDE.local.md`, for every directory from the project root down to the working directory | First request |
| Nested | The same three names for a directory under the working directory | The request after the `read` tool touches a file in that directory |
| Auto memory | `<claude home>/projects/<repository>/memory/MEMORY.md` | First request |

Each file renders as an `Instructions from: <displayPath>` block. The first request carries the managed, user, project, and auto-memory files in one `user` message under the loader `claude-code`; a nested directory folds its own message under the loader `claude-memory`. A memory message that is no longer in the model-visible history — because compaction shadowed it — folds again from disk.

`CLAUDE.md` and `CLAUDE.local.md` are the two names the Harness's own `agent-instructions` loader also claims, under different rules: it reads them from the same directories but expands no `@path` imports, caps a file at 1 MiB rather than 4 MiB, deduplicates same-directory content, and never reads the managed policy, the user home, `<dir>/.claude/CLAUDE.md`, or the auto-memory index. `takeOverClaudeMd` (default true) resolves the overlap: this package loads the two names, and every `agent-instructions` message entering a step has its `CLAUDE.md`/`CLAUDE.local.md` sections removed. The message itself is kept, because that loader confirms its baseline by message identity — a rewritten message stays a visible baseline instead of being re-composed. `AGENTS.md` and `AGENTS.local.md` keep loading from that loader, on its own terms.

`<repository>` is the git repository root — a `.git` file resolves a linked worktree back to it — with every character outside `[A-Za-z0-9]` replaced by `-`, matching the directory names Claude Code writes under `projects/`. Only the index is read; the topic files beside it stay on disk for the model to read on demand.

Two preprocessing rules apply to every loaded file. `@path` imports expand in place: relative to the importing file, `~/` against the process user home, at most `maxImportDepth` hops, skipping inline code spans and fenced code blocks, and expanding each file at most once per batch so a repeated or circular import stays literal. A token that names no readable file stays literal too, which is what keeps an `@mention` or an email address untouched. Block-level HTML comments are removed, while an inline comment, a comment inside a code fence, and an unterminated comment are kept.

### Scoped Rules

Rules under `.claude/rules/**` (project) and `~/.claude/rules/**` (user) are folded under the `claude-rule` loader. A rule whose YAML frontmatter carries a `paths:` glob list is path-scoped: it folds into the request that follows a `read` of a file matching one of those globs. A rule without `paths` (or with an empty list) is always-on and folds into the first request like `CLAUDE.md`. Globs are matched against the project-root-relative path; the path-scoped trigger uses the harness `read` tool, and any matching rule is folded at most once per session.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

This section explains how discovery is organized; the observable behavior is fully covered in [Use this package](#use-this-package).

### Design concept

The skill provider follows the `skill-filesystem` model: discovery parses frontmatter into catalog entries, while every load re-reads the file, so body edits need no cache invalidation. The memory and rule contributors reuse the `agent/pre-step` waterfall the way `agent-instructions` does, folding their instructions after the last admitted user message. Both use `ctx.fs` when a filesystem service is present, falling back to abortable Node I/O.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: registers the provider and the instruction/rule listeners |
| [`src/provider.ts`](src/provider.ts) | Skill provider: root resolution, discovery, and load |
| [`src/parse.ts`](src/parse.ts) | `SKILL.md` frontmatter parsing |
| [`src/frontmatter.ts`](src/frontmatter.ts) | Shared YAML frontmatter parsing used by skills and rules |
| [`src/file-text.ts`](src/file-text.ts) | Claude home resolution, project-root walk, and file reads shared by every loader |
| [`src/memory.ts`](src/memory.ts) | Memory-file locations, `@path` imports, comment stripping, and the auto-memory index |
| [`src/instructions.ts`](src/instructions.ts) | Memory listener: the session-start batch, each read directory's memory, and removing the owned names from the workspace loader |
| [`src/render.ts`](src/render.ts) | `Instructions from:` rendering under one byte budget |
| [`src/rules.ts`](src/rules.ts) | `.claude/rules/**` discovery, `paths:` matching, and read-triggered folding |
| — | No runtime invariant companion is published; this package exposes no independent event sequence or mutable data relation beyond the registry and message-source contracts. |

</details>

-----

<a id="model-experience"></a>
## Model Experience

### Skills catalog

#### What the model sees

The `dsh-tool-skill` tool renders this provider's invocable names and capped descriptions into the session skill catalog, source-tagged `project-claude` (rank 250) and `user-claude` (rank 550), so the model can invoke a skill by name next to every other catalog entry.

#### Token effect

Each skill contributes one capped description to the catalog per render. A skill's body loads only when the model invokes that skill, adding its content for that call.

#### KV Cache effect

The catalog is part of the tool surface and is stable across requests; a skill body loads on demand and does not change the reusable request prefix.

### Memory and rule instructions

#### What the model sees

Claude Code memory files and scoped rules reach the model as instructions-form `user` messages. The session-start batch — the managed policy file, `~/.claude/CLAUDE.md`, every directory's `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` from the project root down to the working directory, and the auto-memory index — folds into the first request under the loader `claude-code`. A subdirectory's memory folds under `claude-memory` in the request that follows a `read` of a file in that directory. Always-on rules (`.claude/rules/**` without `paths`) and path-scoped rules arrive the same way under `claude-rule`. The workspace-instruction loader's `AGENTS.md` sections arrive in its own message, with its `CLAUDE.md`/`CLAUDE.local.md` sections removed.

##### Memory instruction template

```markdown
Instructions from: .claude/CLAUDE.md

<memory-body>
```

##### Rule instruction template

```markdown
Instructions from: .claude/rules/api.md

<rule-body>
```

#### Token effect

The session-start batch and each nested directory fold once per session, each bounded by `maxMemoryRenderBytes`; a memory file larger than `maxMemorySourceBytes` is skipped, and the auto-memory index is capped at its first 200 lines or 25 KB. A compaction that shadows a folded memory message makes it fold again on the next request. Each folded rule is one retained user-role message bounded by `maxRuleRenderBytes`; a rule file larger than `maxRuleSourceBytes` is skipped. Always-on rules inject once per session, and a scoped rule injects once when activated.

#### KV Cache effect

Append-only; folded memory and rules follow the reusable request prefix and do not invalidate existing KV-cache entries.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No skill watcher yet** — the provider discovers on `list()`; dynamic add/rename/delete of `.claude/skills` entries is currently picked up only when discovery runs again (for example after another provider invalidates the catalog).
- **Memory is not reconciled after edits** — the memory files are folded when they first enter a request; later edits are not re-read mid-session. A nested directory's memory is read once, on the first read under it. Compaction is the exception: a shadowed memory message folds again from disk.
- **The takeover reads the workspace loader's message format** — removing the owned sections matches the `Instructions from:` / `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:` headings that loader writes. A format change leaves both loaders injecting the file, which the composition specs in `tests/rules-composition.spec.ts` catch.
- **An intro-only reminder survives a `CLAUDE.md`-only repository** — the loader's message is kept so it stays a visible baseline and is not recomposed on every step, leaving its one-line intro with no sections under it.
- **Nested memory and path-scoped rules trigger on reads only** — matching Claude Code, both fold when the `read` tool touches a matching file; `write`/`edit` do not trigger them, so a rule or memory file authoring a file it scopes may not activate.
- **Auto memory is read-only here** — the harness injects `MEMORY.md` but never appends to it, so a session's learnings do not reach Claude Code's own store.
- **Claude Code's `settings.json` is not consulted** — `autoMemoryDirectory` set there is ignored; the plugin's own `autoMemoryDirectory` field is the override.
- **Imports are not approval-gated** — Claude Code asks before a project memory file imports a path outside the working directory; this package resolves such an import without asking.
- **`AGENTS.md` keeps loading alongside `CLAUDE.md`** — Claude Code's default reads `AGENTS.md` only when no `CLAUDE.md` or `CLAUDE.local.md` exists in the working directory or above it; here the workspace loader still reads it on its own terms.
- **User-level path rules are folded on the same read trigger** — the reference implementation silently ignores `~/.claude/rules` path rules; this package folds both project and user trees (each at most once).
- **Project scope is the nearest `.git` ancestor** — workspaces without that marker fall back to the supplied cwd.
- **Malformed entries disappear** — a `.claude/skills` file without valid frontmatter is skipped rather than surfaced in the catalog.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
