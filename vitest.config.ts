/**
 * Spec runner for this repository.
 *
 * The suite runs on the Harness checkout's `vitest` binary because this package
 * does not install a test runner of its own:
 *
 *   node_modules/.bin/vitest run --root dsh-claude-compat     # from the Harness checkout
 *
 * Harness packages resolve from this package's `node_modules`, so a spec may
 * import `@deepseek-ai/*` runtime values that this package declares.
 */
export default {
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    pool: 'forks',
  },
}
