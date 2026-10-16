# Development verification for this plugin

This repository is a standalone package: its specs are not part of the Harness
monorepo test gate, and it installs neither the Harness runtime packages the
composition specs mount nor React. The Harness checkout beside it owns the
`vitest` binary, so both commands below run **from that checkout**.

## Full suite (recommended)

```sh
node_modules/.bin/vitest run --root dsh-claude-compat --config vitest.harness.config.ts
```

`vitest.harness.config.ts` resolves `@deepseek-ai/*` through the checkout's
`tsconfig.base.json` paths and React through the checkout's pnpm store, so every
spec runs — including the real Loader and real agent-loop composition specs and
the settings-section render spec. Seven suites, 95 tests.

`rules-composition.spec.ts` carries the takeover acceptance case: it mounts this
plugin and `@deepseek-ai/dsh-agent-instructions` in the deployed registration
order (this plugin first, as a host row registered at boot, against a loader
that registers from the lazily-mounted agent preset) and asserts the first model
request carries `CLAUDE.md` exactly once, with its `@import` expanded, while the
loader's own `AGENTS.md` section survives.

The composition specs mount the real directory fixture through
`mountAgentLoopTestDependencies(ctx, { workingDirectory: true })`, after the
local filesystem they read through. `@deepseek-ai/dsh-agent-instructions` and
`@deepseek-ai/dsh-tool-fs` both inject `workingDirectory`, so without it those
plugins stay inactive and the read tool never becomes available.

## Self-contained subset

```sh
node_modules/.bin/vitest run --root dsh-claude-compat
```

`vitest.config.ts` resolves `@deepseek-ai/*` from this package's own
`node_modules` and takes only `*.spec.ts`, which is everything a spec that needs
no Harness runtime package and no React requires:

- `tests/memory.spec.ts` — memory-file discovery, `@path` imports, auto memory,
  nested memory, the `CLAUDE.md` takeover, and the listener, including the
  prompt-loading / auto-memory split.
- `tests/memory-write.spec.ts` — Claude auto-memory topic creation, index updates,
  path restrictions, and the independent live write switch.
- `tests/claude-compat.spec.ts` — `SKILL.md` parsing, the skill provider, memory
  loading, and the plugin registration, including the independent switches.

The rest need the full run: `rules.spec.ts`, `rules-composition.spec.ts`, and
`loader-composition.spec.ts` mount `@deepseek-ai/dsh-agent-loop`, `-testkit`,
`-fs-local`, and `-tool-fs`, which this package does not depend on;
`context-injection-section.spec.tsx` renders the settings section and so needs
React.

## Running the rest without a checkout

Both composition suites that only read published packages can still run where no
Harness checkout has `node_modules`. Install the runner plus
`@deepseek-ai/dsh-agent-loop`, `-agent-loop-testkit`, `-fs-local`, `-tool-fs`,
`-agent-instructions`, `-system-prompt`, `-util-workspace-path`, React, `jsdom`
and the published `@deepseek-ai/cordis-plugin-loader` / `-include` (all
`--no-save`), stage the checkout's `packages/core/agent-loop/tests/mock-adapter.ts`
inside the package (it only imports `@deepseek-ai/dsh-llm`), point an alias at
that copy for `rules.spec.ts`'s relative import, and inline
`@deepseek-ai/dsh-client-ui-primitives` so Vite transforms its CSS modules.

Measured that way on 2026-10-17, against `lib/` built from the same tree: seven
suites, 95 tests, all green. The caveat is the vendored loader and include come
from npm (`1.0.6` / `1.0.10`) rather than the checkout's sources, so a failure in
`loader-composition.spec.ts` is only conclusive once it also reproduces through
`vitest.harness.config.ts`.

Both configs are development scaffolding, and they live in this repository now.
Fold the runner itself in when this package installs a `vitest` of its own.
