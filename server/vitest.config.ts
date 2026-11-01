import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@crewbridge/shared': new URL('../shared/src/index.ts', import.meta.url).pathname } },
  test: { environment: 'node', testTimeout: 20_000, hookTimeout: 60_000, fileParallelism: false },
})
