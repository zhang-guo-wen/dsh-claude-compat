import { defineConfig } from 'tsdown'
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'lib',
  dts: false,
  deps: { neverBundle: [/^@deepseek-ai\//] },
  clean: true,
})
