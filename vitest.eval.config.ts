import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import { loadEnv } from './vitest.config'

/**
 * Manual AI evals — they call the real model and cost money, so the main
 * config excludes them and CI never runs them. Run deliberately:
 *
 *   npx vitest run --config vitest.eval.config.ts
 *
 * Standalone rather than mergeConfig(base): merge unions include/exclude, so
 * the base's `exclude: tests/_manual/**` would win and nothing would run.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/_manual/**/*.test.ts'],
    env: loadEnv(),
    testTimeout: 120_000,
  },
})
