/**
 * Full-suite runner: every spec in this repository, resolved against a sibling
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
 * `vitest.config.ts` is the self-contained subset that runs without the
 * checkout; see tests/README.md for which specs each covers.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { standardDecoratorPlugin, vitestExecArgv } from '../vitest.shared.ts'

/**
 * Locate a package the checkout keeps only in its pnpm store, so a component
 * spec's React face resolves without pinning a version here.
 * @param name - package name to locate.
 * @returns the absolute package directory of the newest stored copy.
 */
function pnpmPackage(name: string): string {
  const store = fileURLToPath(new URL('../node_modules/.pnpm/', import.meta.url))
  const entries = readdirSync(store).filter(entry => entry.startsWith(`${name}@`)).sort()
  const entry = entries[entries.length - 1]
  if (entry === undefined) throw new Error(`no stored ${name} in ${store}`)
  return join(store, entry, 'node_modules', name)
}

const react = pnpmPackage('react')
const reactDom = pnpmPackage('react-dom')

export default {
  plugins: [tsconfigPaths({ projects: ['../tsconfig.base.json'] }), standardDecoratorPlugin()],
  resolve: {
    alias: [
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
