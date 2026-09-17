# dsh-claude-compat

English | [中文](README.zh.md)

A standalone plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that makes the
harness work with your existing **Claude Code / Codex** setup, and adds a **Harness 兼容** settings page for managing
MCP servers and prompt rules from the Web UI instead of hand-editing YAML.

It does not bundle `@deepseek-ai/*`; those resolve from the host harness at runtime.

## Screenshots

### MCP 管理 — every configured server, live

Lists each MCP server with its scope, description, and running status, and lets you add, edit, enable, or disable one.
Changes reach the running host with no restart. Server names are blurred here; the scope, status, and controls are not.

![MCP management](docs/mcp-list.png)

### MCP 管理 — add or edit a server

Paste Claude-compatible connection JSON; it is parsed and validated on save, so a typo is reported instead of stored.

![MCP editor](docs/mcp-editor.png)

### 提示词管理 — system prompt and rule toggles

A system-level prompt box plus master switches for Claude-rule and Codex-rule injection.

![Prompt tab](docs/prompt-tab.png)

## What it does

- **MCP management.** Add, edit, enable, and disable MCP servers from the settings page. Global rows and per-preset
  rows are both listed with their live status. Toggling shows a transient `启动中 / 停止中` while the MCP child process
  starts or stops, so the list never blocks.
- **On-demand MCP loading.** A stopped server costs nothing. The model can call `mcp_list`, `mcp_load`, and
  `mcp_unload` to start a server for the calling session only; the loaded tools never leak into another session.
  Connections are per-session, and a session that ends closes the connections it opened.
- **MCP tool filters.** The MCP edit dialog lists the methods a server publishes with every one checked; an unchecked
  method never enters context — neither listed nor callable. Wildcards are available by writing
  `context-injection.mcpTools` yourself. See below.
  Three loading modes trade tool-list stability against binding quality — see below.
- **Claude Code compatibility.** Discovers `<root>/.claude/skills/**` into the session skill catalog, folds
  `.claude/CLAUDE.md` and `~/.claude/CLAUDE.md` into the first request, and folds `.claude/rules/**` — including
  `paths:`-scoped rules that activate once you read a matching file.
- **Codex compatibility.** Folds `.codex/AGENTS.md` and `~/.codex/AGENTS.md`.
- **`/btw`.** Ask a side question in a Session forked from the current one. The fork is anchored at the last
  completed turn, so a question asked mid-turn forks from the last finished turn, and the new Session keeps
  the parent's completed turns as its own history. The answer appears in a card inside the composer; when the
  answer lands, the card closes and the forked Session is archived.

### MCP loading modes

A row's enable switch and the loading mode answer different questions: the switch says **whether a server may be used
at all**, the mode says **when an allowed server enters context**.

| Mode | Behavior |
|---|---|
| Load all (`eager`) | Allowed servers mount at session start; their tools are always in the request |
| Dynamic insert (`dynamic`, default) | Allowed servers stay unmounted; `mcp_load` mounts one into the calling session, so its tools join the request — best tool binding, but the tool list changes once per load |
| Lazy (`lazy`) | Allowed servers stay unmounted; `mcp_load` connects over the MCP SDK **without registering anything** and returns the tool schemas, and the model calls them through the fixed `mcp_call` proxy — the tool list never changes, so the request-cache prefix is never invalidated |

Set it in **设置 → Harness 兼容 → MCP 管理 → MCP loading**. The choice is stored in the user's
`context-injection` settings namespace and swaps the tool set from the next request on, in every session.

Measured on one preset with four MCP servers: `dynamic` sends **29** tools on the first request (built-ins plus
`mcp_list`/`mcp_load`/`mcp_unload`), `eager` sends **378**, 348 of them MCP tools.

### Processes and lifetime

Under `dynamic` / `lazy`, a server that has not been loaded starts **no process at all** — MCP is stopped when the
session begins, until some `mcp_load`.

Once loaded, connections are per-session: a repeated `mcp_load` in one session reuses the same one, while **different
sessions each get their own** (for stdio, one child process each); subagents and forked sessions count as separate
sessions. **A session that ends closes the connections it opened**, with no `mcp_unload` required. `eager` is the
opposite — the preset is a standing mount, so one shared instance serves every session.

> MCP rows configured on the **global plane** (written directly into `cordis.yml`) are outside on-demand loading:
> they always start, as if permanently `eager`. Put a server in a preset to make it on-demand.

### MCP tool filters

A server often publishes dozens of tools while a session uses a few. Once filtered, **only the tools the rules admit
are handed to the model when the server loads**: a hidden tool is absent from the `mcp_load` result and `mcp_call`
refuses to invoke it.

**In the settings page:** Settings → Harness 兼容 → MCP 管理 → a row's **Edit** → the **Tools** block at the bottom of
the dialog.

Opening it connects to that server once, lists the methods it publishes, and **checks every one of them**. Unchecking a
method disables it; the change applies on save. The block carries an `enabled/total` count, `Load tools` (re-read after
editing the JSON), and `All` / `None`.

- Rules are only rewritten when the server actually answered; a failed connection leaves the stored rules untouched.
- Everything checked = no rules for that row, so every published tool stays visible (also the state of a new row).

**For wildcards, write them yourself.** Rules live in the `context-injection` settings namespace under `mcpTools`,
keyed by the row key (`preset:<preset id>:<serverName>`, the same key the description map uses):

| Form | Meaning |
|---|---|
| `create_workitem`, `get_workitem` | **Allow list**: one entry without `!` means only matching tools stay visible |
| `!delete_*` | **Deny list**: when every entry starts with `!`, matching tools are hidden and the rest stay |
| `*`, `?` | Wildcards: `*` matches any run of characters, `?` matches exactly one |

What the dialog saves is exactly that deny list, so unchecking `delete_workitem` writes:

```yaml
context-injection:
  mcpTools:
    "preset:standard-yunxiao:alibaba-devops-mcp":
      - "!delete_workitem"
```

What to expect:

- **Rules are read at load time.** A committed change applies to the **next `mcp_load`**; an already-loaded server keeps
  the tools it was admitted with, and `mcp_unload` followed by `mcp_load` picks up the new rules.
- **A filtered row always takes the proxy carrier** (`mcp_load` lists, `mcp_call` invokes), even under the `dynamic`
  mode: native registration publishes every discovered tool and offers no way to hold some back.
- **`eager` ignores filters**, because that mode mounts the whole server through the harness's mcp-client. The plugin
  warns at startup when rules are configured for it.
- **A malformed rule set hides nothing**: an unparsable value filters nothing, so a typo never empties a server.

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
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v0.1.3-alpha.1"
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

Every field has a working default; the table is for overriding one. Fields marked with a settings-page control can be
changed there instead of in the composition.

| Field | Default | Meaning |
|---|---|---|
| `providerName` | `claude-code` | Unique provider name registered on `ctx.skills` |
| `claudeHome` | `$CLAUDE_HOME` or `~/.claude` | Claude Code home, scanned for `skills` and `CLAUDE.md` |
| `codexHome` | `$CODEX_HOME` or `~/.codex` | Codex home, scanned for `AGENTS.md` |
| `projectRootMarkers` | `['.git']` | Directory entries that identify the project root |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | Scan the project / user `.claude/skills` root |
| `includeProjectRule` / `includeGlobalRule` | `true` | Load the project / global `CLAUDE.md` rule |
| `includeProjectRules` / `includeGlobalRules` | `true` | Fold the project / user `.claude/rules/**` tree |
| `maxRuleSourceBytes` | `1048576` | Maximum UTF-8 bytes read from one rule file |
| `maxRuleRenderBytes` | `262144` | Maximum UTF-8 bytes rendered in one rules batch |
| `claude` / `codex` | `true` | Rule-injection master toggles (settings page) |
| `mcpLoading` | `dynamic` | MCP loading mode (settings page) |
| `maxQuestionBytes` | `4096` | Maximum UTF-8 bytes in the `/btw` side question |

```yaml
- name: '@zhang-guo-wen/dsh-claude-compat'
  config:
    mcpLoading: lazy
```

## Known limitations

- **No skill watcher** — `.claude/skills` is discovered when the catalog is listed; an add, rename, or delete is picked
  up on the next discovery.
- **Rules fold once per session** — `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, and `.codex/AGENTS.md` are read at the
  first request; later edits are not re-read mid-session.
- **Path-scoped rules trigger on `read` only** — `write` and `edit` do not activate them.
- **Enabling an MCP still waits for the child process to start** (`npx -y …` / `uvx …` usually 1–3s). The UI stays
  responsive; installing the server as a direct executable shortens it.

## Development

[AGENTS.md](AGENTS.md) owns the build, the Cordis/Typert plugin contract, and the pitfalls.

```sh
npm run build      # host (tsdown) + client (rolldown ModuleLoader handoff)
npm run typecheck
```

## License

Apache License 2.0 — see [LICENSE](LICENSE). This product includes MIT-licensed portions derived from DeepSeek
Harness; see [NOTICE](NOTICE). Not affiliated with or endorsed by Claude Code, Codex, or their owners.
