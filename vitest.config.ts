import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Vitest had no config, so it could not resolve the `@/` alias that every
 * module in `src/` uses. The workaround was to keep tested code free of
 * imports, which pushed shape onto the source for the test runner's benefit —
 * `src/lib/scheduling/slots.ts` exists as a separate file for exactly that
 * reason.
 *
 * Resolving the alias here means anything can be tested where it lives.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
