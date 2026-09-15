# Development verification for this plugin

This repository is a standalone package, so its specs are not part of the
Harness monorepo test gate. Two suites run inside this repository with Node's
own type stripping and need no test runner:

```sh
node --test tests/*.spec.ts   # not wired yet; see below
```

Until that exists, run the Harness-side checks:

1. **Card registry, receipt text, and journal follower** — plain specs at
   `tests/btw-card.spec.ts` and `tests/btw-stream.spec.ts`. They import only
   relative sources, so any runner that resolves `@deepseek-ai/dsh-*` from this
   repository's `node_modules` executes them:

   ```sh
   # from the Harness checkout, whose vitest resolves those packages
   node_modules/.bin/vitest run --config vitest.plugin-compat.config.ts
   ```

2. **Card rendering** — the component is mounted under the Harness renderer's
   binding (`useSyncExternalStore` over the real `dsh-client-store`) by
   `tests/btw-card-render.tmp.spec.tsx`. It only runs from the Harness checkout,
   whose `vitest.plugin-compat.config.ts` supplies React and `@deepseek-ai/dsh-*`
   resolution, because this repository has no React installation; delete it once
   this repository has a runner that can mount React itself.

`vitest.plugin-compat.config.ts` in the Harness checkout is the temporary config
those two commands use (`--config` is required; the repo config does not include
this directory). Both are development scaffolding: fold them into this
repository when it grows a test runner.
