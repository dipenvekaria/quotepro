import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * One definition of what this app needs from its environment.
 *
 * There were two. `env.ts` declared 33 variables and validated them at boot,
 * while ten more were read straight from `process.env` with no validation —
 * including the database and every credential for a live e-signature
 * integration. A missing one failed at 3am as a connection error rather than at
 * startup as a sentence.
 *
 * This fails the moment a new one appears outside the contract, which is the
 * only way the contract stays true.
 */

/**
 * Injected by the platform, not configured by us. Vercel sets these; they are
 * not ours to declare or validate.
 */
const PLATFORM_PROVIDED = new Set(['VERCEL_ENV', 'NEXT_PUBLIC_VERCEL_ENV', 'NODE_ENV'])

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, acc)
    else if (/\.tsx?$/.test(entry)) acc.push(full)
  }
  return acc
}

describe('the environment contract', () => {
  const envSource = readFileSync('src/lib/env.ts', 'utf8')
  const declared = new Set(
    [...envSource.matchAll(/^ {2}([A-Z0-9_]+):/gm)].map((m) => m[1]),
  )

  it('declares a meaningful number of variables', () => {
    // Guards against the regex silently matching nothing after a refactor,
    // which would make the assertion below vacuously true.
    expect(declared.size).toBeGreaterThan(20)
  })

  it('is the only place the app reads its environment', () => {
    const offenders: string[] = []

    for (const file of sourceFiles('src')) {
      // env.ts is where the reading is supposed to happen.
      if (file.endsWith(join('lib', 'env.ts'))) continue
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        const name = m[1]
        if (PLATFORM_PROVIDED.has(name) || declared.has(name)) continue
        offenders.push(`${name} (${file})`)
      }
    }

    expect(
      offenders,
      `read from process.env but not declared in src/lib/env.ts:\n  ${offenders.join('\n  ')}\n\n` +
        'Add it to the schema so a missing value fails at boot with a sentence, ' +
        'not at 3am as a connection error.',
    ).toEqual([])
  })
})
