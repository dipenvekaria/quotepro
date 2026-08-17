import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

/**
 * An estimate is internal. The customer sees a firm price.
 *
 * Telling a homeowner that part of their quote is guesswork invites them to
 * negotiate it, and it is not even true by the time they read it — a
 * salesperson has looked at the number and decided to send it. The flag exists
 * so the contractor can judge the line before sending, and for nobody else.
 *
 * This guards the boundary rather than trusting it: the public paths currently
 * select explicit column lists, and the failure mode is somebody later reaching
 * for `select('*')` because it is shorter.
 */

const publicFiles = execSync(
  "find src/app/q src/app/i src/lib/pdf -name '*.ts' -o -name '*.tsx' 2>/dev/null || true",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)

describe('customer-facing code', () => {
  it('finds files to check', () => {
    // Guards against the glob silently matching nothing, which would make every
    // assertion below vacuously true.
    expect(publicFiles.length).toBeGreaterThan(3)
  })

  it('never reads is_estimate or estimate_basis', () => {
    const offenders = publicFiles.filter((f) => /is_estimate|estimate_basis/.test(readFileSync(f, 'utf8')))
    expect(offenders, `these render to a customer: ${offenders.join(', ')}`).toEqual([])
  })

  it('never selects quote_items with a wildcard', () => {
    // `select('*')` would pull is_estimate through without anyone deciding to.
    const offenders = publicFiles.filter((f) => {
      const src = readFileSync(f, 'utf8')
      return /from\(['"]quote_items['"]\)[\s\S]{0,80}select\(\s*['"]\*/.test(src)
    })
    expect(offenders, `wildcard select on quote_items: ${offenders.join(', ')}`).toEqual([])
  })
})
