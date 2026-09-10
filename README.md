# dsh-claude-compat

English | [中文](README.zh.md)

A standalone plugin for DeepSeek Harness (DSH) that makes the harness work with your existing
Claude Code / Codex setup — and adds a **Harness 兼容** settings page where you manage MCP servers
and prompt rules from the Web UI instead of hand-editing YAML.

![MCP management](packages/claude-compat/docs/mcp-list.png)

## What you get

- **MCP management, live.** The settings page lists every MCP server (`@deepseek-ai/dsh-mcp-client`
  row) — global and per agent preset, with its scope, description, and status — and lets you
  **add / edit / enable / disable** each one. Writes go to the composition file and are applied to
  the running host immediately, with no restart. Toggling shows a transient `启动中 / 停止中` state
  while the MCP child process starts or stops, so the list never blocks.
- **Claude Code compatibility.** Discovers `<root>/.claude/skills/**` into the session skill catalog,
  folds `.claude/CLAUDE.md` and `~/.claude/CLAUDE.md` into the first request, and folds
  `.claude/rules/**` — including `paths:`-scoped rules that activate when you read a matching file.
- **Codex compatibility.** Folds `.codex/AGENTS.md` and `~/.codex/AGENTS.md`.
- **A system prompt field.** Write a system-level prompt from the settings page; it is injected as a
  real system-prompt section.
- **Master toggles.** Turn Claude-rule and Codex-rule injection on or off.
- **`/btw`.** Ask a side question in a forked, continuable child subagent.

## Screenshots

### 提示词管理 — system prompt and rule toggles

![prompt tab](packages/claude-compat/docs/prompt-tab.png)

### MCP 管理 — one JSON box, parsed and validated on save

![MCP editor](packages/claude-compat/docs/mcp-editor.png)

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add @zhang-guo-wen/dsh-claude-compat
npx @deepseek-ai/dsh web
```

Or declare it as a bundle in the profile's `package.json` and install it like any other plugin:

```json
{
  "dsh": { "profile": { "bundles": ["@zhang-guo-wen/dsh-claude-compat"] } },
  "dependencies": { "@zhang-guo-wen/dsh-claude-compat": "^0.1.1-alpha.1" }
}
```

## Managing MCP servers

Open **设置 → Harness兼容 → MCP 管理**. Every MCP row the harness has configured is listed with its
scope (`全局` or a preset id), a plugin-owned description, and its live status. Each row has an
**编辑** button and an enable/disable switch; **新增 MCP** opens the editor.

That server list is a live read of the Cordis Loader, so a change shows up as soon as it is applied:

- **Global** rows use the loader directly and are live immediately.
- **Preset (agent)** rows write the preset's `agent.cordis.yml` and refresh the preset's standing
  mount in place, so enabling or disabling one MCP never restarts the others.

### The editor JSON

The editor takes Claude-compatible connection JSON and normalizes it. All of these work:

```json
{ "type": "stdio", "command": "cmd", "args": ["/c", "npx", "-y", "@upstash/context7-mcp"] }
```

```json
{ "context7": { "command": "cmd", "args": ["/c", "npx", "-y", "@upstash/context7-mcp"] } }
```

```json
{ "mcpServers": { "context7": { "command": "cmd", "args": ["/c", "npx", "-y", "@upstash/context7-mcp"] } } }
```

Rules:

- A missing `type` is inferred: a `command` means stdio, a `url` means streamable HTTP.
- A single-entry map or an `mcpServers` wrapper uses its key as the server name.
- A bare spec derives the server name from the arguments (`@upstash/context7-mcp` → `context7-mcp`)
  when the **服务器名** field is left empty.
- `stdio` needs `command`; `http` / `sse` / `streamable-http` need `url`.

The **配置范围** dropdown lists Global and every agent preset, so you pick a target instead of typing
an id. **描述** is a plugin-owned label shown in the list, stored in the `context-injection` settings
namespace — not part of the MCP connection.

## Claude Code / Codex compatibility

### Skills

| Rank | Source | Path |
|---|---|---|
| 250 | `project-claude` | `<projectRoot>/.claude/skills` |
| 550 | `user-claude` | `~/.claude/skills` |

The project root is the nearest ancestor containing `.git`. A skill is
`<root>/.claude/skills/<name>/SKILL.md` (or a flat `<name>.md`) with YAML frontmatter: required
`name` and `description`, plus optional `whenToUse`, `metadata`, `disable-model-invocation`, and
`user-invocable`.

### Rules

The project `.claude/CLAUDE.md` and the global `~/.claude/CLAUDE.md` are folded into the first request
as `user` messages under the `claude-code` source kind. Rules under `.claude/rules/**` (project) and
`~/.claude/rules/**` (user) fold under `claude-rule`: a rule whose frontmatter carries a `paths:` glob
list is path-scoped and folds after a `read` of a matching file; a rule without `paths` is always-on.

### Configuration

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `claude-code` | Unique provider name registered on `ctx.skills` |
| `claudeHome` | `$CLAUDE_HOME` or `~/.claude` | Claude Code home, scanned for `skills` and `CLAUDE.md` |
| `codexHome` | `$CODEX_HOME` or `~/.codex` | Codex home, scanned for `AGENTS.md` |
| `projectRootMarkers` | `['.git']` | Directory entries that identify the project root |
| `includeProjectRoot` | `true` | Scan the project `.claude/skills` root |
| `includeGlobalRoot` | `true` | Scan the user `~/.claude/skills` root |
| `includeProjectRule` | `true` | Load the project `.claude/CLAUDE.md` rule |
| `includeGlobalRule` | `true` | Load the global `~/.claude/CLAUDE.md` rule |
| `includeProjectRules` | `true` | Fold the project `.claude/rules/**` tree |
| `includeGlobalRules` | `true` | Fold the user `~/.claude/rules/**` tree |
| `maxRuleSourceBytes` | `1048576` | Maximum UTF-8 bytes read from one rule file |
| `maxRuleRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one rules batch |
| `claude` / `codex` | `true` | Rule-injection master toggles (also editable from the settings page) |
| `maxQuestionBytes` | `4096` | Maximum UTF-8 bytes in the `/btw` side question |
| `provider` | `fork` | The `ctx.subagents` fork provider name used by `/btw` |

## Known limitations

- **No skill watcher** — `.claude/skills` is discovered on `list()`; add/rename/delete is picked up
  when discovery runs again.
- **Rules fold once per session** — `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, and `.codex/AGENTS.md`
  are read at the first request; later edits are not re-read mid-session.
- **Path-scoped rules trigger on `read` only** — `write` / `edit` do not activate them.
- **Enabling an MCP still takes the child process's own startup time** (`npx -y …` / `uvx …` usually
  1–3s). The UI stays responsive; installing the server as a direct executable shortens it.

## Development

See [AGENTS.md](AGENTS.md) for the build, the Cordis/Typert plugin contract, and the pitfalls.

```sh
npm run build      # host (tsdown) + client (rolldown ModuleLoader handoff)
```

## License

MIT
