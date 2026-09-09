---
description: "A /btw command that forks a continuable child subagent to answer a side question, for users and maintainers choosing, composing, or debugging context-inheriting sub-task forks."
kind: "package-reference"
---

# @deepseek-ai/dsh-command-btw

English | [中文](README.zh.md)

## Summary

`dsh-command-btw` lets a user ask Claude Code's "by the way" side question as its own sub-task: type `/btw` plus a question, and the harness **forks a continuable child subagent** that answers it. The child inherits the parent session's completed-turn prefix as its initial context, so it sees what the parent already discussed, and it runs as a **separate sub-task session** you can open and continue conversation with. The parent session only records that `/btw` was started and shows a short acknowledgement; the question and the answer are not model-surface messages of the parent. The fork requires a fully balanced history — it refuses while a turn is still open or before any turn has completed.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Users can ask a side question from the Web client out of the box: the `/btw` command ships with the standard `dsh` base and forks a sub-task session using the `fork` subagent provider. A custom app gets the same command by mounting the command registry, the `subagents` service with a continuable-capable fork provider, the session-projection registry, and this plugin.

### The `/btw` command

Type `/btw` followed by a question and send it. The harness forks a continuable child subagent, delivers the question as the child's initial prompt, and records a `btw/spawn` event naming the child session:

| Input | Result |
|---|---|
| `/btw what language is this project?` | Fork a child subagent; the parent shows `Started /btw as child session {id}.` |
| `/btw` | A usage error: `A question is required. Usage: /btw <question>`. Whitespace-only input counts as empty. |
| A question longer than `maxQuestionBytes` | An error naming the byte limit. |
| `/btw` while the parent turn is still open | An error asking you to wait for a balanced history. |
| `/btw` before any turn completed | An error asking you to finish a turn first. |

Surrounding whitespace is trimmed, but the question is otherwise kept exactly as typed and recorded verbatim in the log-only `btw/spawn` event.

The command's defaults are deployment policy:

| Config field | Type | Default | Meaning |
|---|---|---|---|
| `maxQuestionBytes` | positive integer | `4096` | Maximum UTF-8 bytes in the side question. |
| `provider` | string | `fork` | The `ctx.subagents` fork provider name that must support continuable children. |

### Composing the command

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: session-projection
  name: '@deepseek-ai/dsh-session-projection'
- id: subagents
  name: '@deepseek-ai/dsh-subagent'
- id: subagent-fork-in-process
  name: '@deepseek-ai/dsh-subagent-fork-in-process'
  config:
    providerName: fork
- id: command-btw
  name: '@deepseek-ai/dsh-command-btw'
  config:
    maxQuestionBytes: 4096
    provider: fork
```

The Web client ships the command. Headless mode, ACP automation, and JSON-RPC provide no command adapter, so `/btw` is unavailable there.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Design concept

The command does not answer the question itself. It forks a continuable child subagent on `ctx.subagents` using the configured fork provider, which seeds the child with the parent session's completed-turn prefix. The child owns its own turns from that point, so the parent and the child have separate sessions and the answer lives in the child. The parent records only a log-only `btw/spawn` event carrying the child id, so `session.deriveMessages()` of the parent is unchanged.

### How a child is forked

The handler validates the question, checks the parent session is in a balanced state (no open turn and at least one completed turn), confirms the provider is registered and continuable-capable, then calls `ctx.subagents.startContinuable`. It records `btw/spawn` after inbox acceptance and returns the short acknowledgement. The child's answer and any follow-up conversation stay in the child session and never surface as a parent model message.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry: `btw/spawn` event declaration, `forkBtw` handler, `/btw` command registration, config validation |
| — | No runtime invariant companion is published; each `btw/spawn` is an independent log-only record with no cross-event or mutable-data relationship. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the package-level contract is not enough. They cover the command registry, the subagent fork capability, and the session-history projection this command depends on.

- [dsh-commands](../../interaction/commands/README.md) — the registry that discovers the global command and its `recordInput` semantics.
- [dsh-subagent](../../subagent/subagent/README.md) — the `ctx.subagents` Service Definition and the continuable fork capability.
- [dsh-subagent-fork-in-process](../../subagent/subagent-fork-in-process/README.md) — the fork provider that seeds a child with the parent's completed-turn prefix.
- [Session projection subsystem](../../../docs/subsystems/session.md) — how `turnBoundary` reports an open turn and how `deriveMessages()` folds the ordered surface.
- [Context group map](../README.md) — where a context-inheriting sub-task command sits next to the request-context plugins.

-----

<a id="model-experience"></a>
## Model Experience

### Human `/btw` sub-task fork

#### What the model sees

The parent session's model never sees the side question or the answer. The command forks a child subagent whose own model requests see the parent's completed-turn prefix plus the question as the child's first prompt. The parent records only `btw/spawn`, `command/run`, and `command/done` — all log-only — so a later `request/header` or `deriveMessages()` of the parent does not include the exchange.

#### Token effect

The side question costs the child subagent's own model turns, not the parent's. Because the child reuses the parent's completed-turn prefix, its first request is eligible for prompt-cache reuse against that prefix. The parent's token count for later turns is unchanged.

#### KV Cache effect

The child's context is a separate session, so it does not invalidate the parent's request cache. The child's own requests may reuse the inherited prefix as cache, independent of the parent.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define where `/btw` is a poor fit or behaves differently than a user might expect. They are current package constraints, not a task backlog.

- **Requires a balanced history** — `/btw` refuses while the parent turn is still open or before any turn has completed, so it cannot be used mid-task.
- **Answer appears only in the child session** — the parent does not render the answer text as a model message; you must open the child sub-task session to read it.
- **Web only among the shipped entry points** — headless mode, ACP automation, and JSON-RPC provide no command adapter, so `/btw` is unavailable there.
- **Depends on a continuable fork provider** — a deployment without a `ctx.subagents` provider that supports continuable children cannot run `/btw`.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is working context for maintainers; it is explicitly non-authoritative. Shipped behavior, limits, and rationale live in the sections above and the package code.

- The `btw/spawn` event carries the `childId` and the trimmed question; the child id is what a client uses to open the sub-task session.
- The acknowledgement text and the error strings are pinned by [`tests/command-btw.spec.ts`](tests/command-btw.spec.ts); changing them changes user-visible output.

</details>
