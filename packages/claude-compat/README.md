---
description: "Claude Code compatibility for the DeepSeek Harness: discover .claude/skills and load CLAUDE.md rules."
kind: "package-reference"
---

# @deepseek-ai/dsh-claude-compat

English | [中文](README.zh.md)

## Summary

Claude Code keeps skills as `<root>/.claude/skills/<name>/SKILL.md`, rules in `CLAUDE.md`, and scoped rules as markdown files under `.claude/rules/**`. This package makes the harness read all three. It registers one more skill provider on the shared registry (`dsh-skill`) so `.claude/skills` appears in the session catalog next to DSH's own roots; it folds the project `.claude/CLAUDE.md` and the user-global `~/.claude/CLAUDE.md` into the first request as their own instructions-form context; and it folds `.claude/rules/**` — a `paths:`-scoped rule when a matching file is read, otherwise at the first request.

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
| `claudeHome` | `$CLAUDE_HOME` or `~/.claude` | Claude Code home; scanned for `skills` and `CLAUDE.md` |
| `projectRootMarkers` | `['.git']` | Directory entries that identify the project root |
| `includeProjectRoot` | `true` | Scan the project `.claude/skills` root |
| `includeGlobalRoot` | `true` | Scan the user `~/.claude/skills` root |
| `includeProjectRule` | `true` | Load the project `.claude/CLAUDE.md` rule |
| `includeGlobalRule` | `true` | Load the global `~/.claude/CLAUDE.md` rule |
| `includeProjectRules` | `true` | Fold the project `.claude/rules/**` tree |
| `includeGlobalRules` | `true` | Fold the user `~/.claude/rules/**` tree |
| `maxRuleSourceBytes` | `1048576` | Maximum UTF-8 bytes read from one rule file |
| `maxRuleRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one rules batch |

### Skills

| Rank | Source | Path |
|---|---|---|
| 250 | `project-claude` | `<projectRoot>/.claude/skills` |
| 550 | `user-claude` | `~/.claude/skills` |

The project root is the nearest ancestor containing `.git`; without one the current cwd is used. Candidates carry a lower rank than DSH's own project roots, so a same-name DSH skill wins a duplicate. A skill is `<root>/.claude/skills/<name>/SKILL.md` (or a flat `<name>.md`) with YAML frontmatter: required `name` and `description`, plus optional `whenToUse`, `metadata`, `disable-model-invocation`, and `user-invocable`.

### Rules

The project `.claude/CLAUDE.md` and the global `~/.claude/CLAUDE.md` are read and folded into the first request as a `user` message under the `claude-code` message-source kind. The harness's own `agent-instructions` loads only same-directory names (`AGENTS.md`, `CLAUDE.md`); this contributor adds the two Claude Code locations without touching that loader. A missing or unreadable rule file is not fatal.

### Scoped Rules

Rules under `.claude/rules/**` (project) and `~/.claude/rules/**` (user) are folded under the `claude-rule` message-source kind. A rule whose YAML frontmatter carries a `paths:` glob list is path-scoped: it folds into the request that follows a `read` of a file matching one of those globs. A rule without `paths` (or with an empty list) is always-on and folds into the first request like `CLAUDE.md`. Globs are matched against the project-root-relative path; the path-scoped trigger uses the harness `read` tool, and any matching rule is folded at most once per session.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

This section explains how discovery is organized; the observable behavior is fully covered in [Use this package](#use-this-package).

### Design concept

The skill provider follows the `skill-filesystem` model: discovery parses frontmatter into catalog entries, while every load re-reads the file, so body edits need no cache invalidation. The instruction contributor reuses the `agent/pre-step` waterfall the way `agent-instructions` does, folding its instructions after the last admitted user message. Both use `ctx.fs` when a filesystem service is present, falling back to abortable Node I/O.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: registers the provider and the instruction/rule listeners |
| [`src/provider.ts`](src/provider.ts) | Skill provider: root resolution, discovery, and load |
| [`src/parse.ts`](src/parse.ts) | `SKILL.md` frontmatter parsing |
| [`src/frontmatter.ts`](src/frontmatter.ts) | Shared YAML frontmatter parsing used by skills and rules |
| [`src/instructions.ts`](src/instructions.ts) | Claude Code rule discovery and pre-step injection |
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

### Rule instructions

#### What the model sees

The Claude Code rules and scoped rules reach the model as instructions-form `user` messages under the `claude-code` and `claude-rule` source kinds. Always-on rules (`.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, and `.claude/rules/**` without `paths`) fold into the first request; a path-scoped rule with a `paths:` glob folds into the request that follows a `read` of a matching file.

##### Rule instruction template

```markdown
<system-reminder>
Instructions from: .claude/rules/api.md

<rule-body>
</system-reminder>
```

#### Token effect

Each folded rule is one retained user-role message bounded by `maxRuleRenderBytes`; a rule file larger than `maxRuleSourceBytes` is skipped. Always-on rules inject once per session, and a scoped rule injects once when activated.

#### KV Cache effect

Append-only; folded rules follow the reusable request prefix and do not invalidate existing KV-cache entries.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No skill watcher yet** — the provider discovers on `list()`; dynamic add/rename/delete of `.claude/skills` entries is currently picked up only when discovery runs again (for example after another provider invalidates the catalog).
- **Claude/Codex rules are not reconciled after edits** — unlike `agent-instructions`, `.claude/CLAUDE.md` and `.codex/AGENTS.md` are folded once at the first request; later edits are not re-read mid-session. Scoped rules follow the same once-per-session rule.
- **Path-scoped rules trigger on reads only** — matching Claude Code, a scoped rule folds when the `read` tool touches a matching file; `write`/`edit` do not trigger it, so a rule authoring a file it scopes may not activate.
- **User-level path rules are folded on the same read trigger** — the reference implementation silently ignores `~/.claude/rules` path rules; this package folds both project and user trees (each at most once).
- **Project scope is the nearest `.git` ancestor** — workspaces without that marker fall back to the supplied cwd.
- **Malformed entries disappear** — a `.claude/skills` file without valid frontmatter is skipped rather than surfaced in the catalog.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
