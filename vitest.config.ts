import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/** `.env.local` without pulling in a dependency just to read six lines. */
function loadEnv(): Record<string, string> {
  try {
    const out: Record<string, string> = {}
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const i = line.indexOf('=')
      if (i < 1 || line.trimStart().startsWith('#')) continue
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    }
    return out
  } catch {
    return {}
  }
}

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
    // Integration tests talk to the local database, so they need the same
    // environment the app runs with.
    env: loadEnv(),
    // A suite that opens real connections is slower than a pure-function one.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
