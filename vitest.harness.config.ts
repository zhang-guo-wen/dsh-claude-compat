/**
 * Full-suite runner: every spec in this repository, resolved against a
 * DeepSeek Harness checkout.
 *
 * This package does not install the Harness runtime packages its composition
 * specs need (`dsh-agent-loop`, `dsh-agent-loop-testkit`, `dsh-fs-local`,
 * `dsh-tool-fs`), a browser store's transitive state library, or React. Running
 * from the Harness checkout makes the workspace's own resolution apply:
 *
 *   node_modules/.bin/vitest run --root dsh-claude-compat --config vitest.harness.config.ts
 *   # ^ run from the Harness checkout, which owns the vitest binary
 *
 * The checkout is the sibling directory by default and `DSH_HARNESS_ROOT`
 * overrides it — the same variable `tools/testing/registry.mjs` sets for the
 * harness lane, and the one a linked worktree has to name, because the package
 * then sits beside the checkout instead of inside it. Every harness dependency
 * (the shared plugin, `typescript`, the pnpm store, the source aliases) is
 * resolved from that root, so this file imports only Node built-ins itself.
 *
 * `vitest.config.ts` is the self-contained subset that runs without the
 * checkout; see tests/README.md for which specs each covers.
 */
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const harness = resolve(process.env.DSH_HARNESS_ROOT ?? fileURLToPath(new URL('../', import.meta.url)))
const requireHarness = createRequire(join(harness, 'package.json'))
const ts = requireHarness('typescript') as typeof import('typescript')

/**
 * The checkout's own source aliases, read from its `tsconfig.base.json`.
 *
 * Resolving Harness packages through the alias list compiles the checkout's
 * source — the same graph the checkout's own specs run — rather than whatever a
 * package build happens to hold, and it keeps a single `cordis` module instance
 * (a second copy leaves enum values such as `FiberState.UNLOADING` undefined).
 */
const harnessConfig = ts.readConfigFile(join(harness, 'tsconfig.base.json'), ts.sys.readFile)
if (harnessConfig.error) throw new Error(`cannot read ${join(harness, 'tsconfig.base.json')}`)
const sourceAliases = Object.entries(
  harnessConfig.config.compilerOptions.paths as Record<string, string[]>,
).map(([name, paths]) => ({
  find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement: resolve(harness, paths[0]!),
}))
const { standardDecoratorPlugin, vitestExecArgv } = await import(
  pathToFileURL(join(harness, 'vitest.shared.ts')).href
)

/**
 * Locate a package the checkout keeps only in its pnpm store, so a component
 * spec's React face resolves without pinning a version here.
 * @param name - package name to locate.
 * @returns the absolute package directory of the newest stored copy.
 */
function pnpmPackage(name: string): string {
  const store = join(harness, 'node_modules', '.pnpm')
  const entries = readdirSync(store).filter(entry => entry.startsWith(`${name}@`)).sort()
  const entry = entries[entries.length - 1]
  if (entry === undefined) throw new Error(`no stored ${name} in ${store}`)
  return join(store, entry, 'node_modules', name)
}

const react = pnpmPackage('react')
const reactDom = pnpmPackage('react-dom')
const harnessPackages = join(harness, 'packages').replace(/\\/g, '/')

export default {
  plugins: [standardDecoratorPlugin()],
  resolve: {
    alias: [
      // `tests/rules.spec.ts` borrows the checkout's scripted adapter with a
      // path relative to the checkout layout (`../../packages/...`). When the
      // package sits beside the checkout that relative path points at nothing,
      // so anchor the prefix at the configured harness root instead.
      { find: /^\.\.\/\.\.\/packages\//, replacement: `${harnessPackages}/` },
      ...sourceAliases,
      { find: /^react$/, replacement: `${react}/index.js` },
      { find: /^react\/jsx-runtime$/, replacement: `${react}/jsx-runtime.js` },
      { find: /^react\/jsx-dev-runtime$/, replacement: `${react}/jsx-dev-runtime.js` },
      { find: /^react-dom$/, replacement: `${reactDom}/index.js` },
      { find: /^react-dom\/client$/, replacement: `${reactDom}/client.js` },
      { find: /^react-dom\/server$/, replacement: `${reactDom}/server.node.js` },
    ],
  },
  test: {
    include: ['tests/**/*.spec.{ts,tsx}'],
    environment: 'node',
    pool: 'forks',
    execArgv: vitestExecArgv,
  },
}
