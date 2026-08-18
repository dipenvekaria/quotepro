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

describe('the estimate basis stays out of customer-facing columns', () => {
  // The column checks above guard the read side. This guards the write side:
  // the basis names the comparable and states the markup, and it must land only
  // in `estimate_basis`. It once also went into `description`, which renders on
  // /q and the PDF — so the leak passed every check above while showing the
  // customer "Estimated from …, 50% markup".
  it('proposeEstimatedItem writes the basis to estimate_basis only', () => {
    const src = readFileSync('src/lib/ai/quote-tools.ts', 'utf8')
    // The estimated-item insert is the one that writes is_estimate; anchor to it
    // rather than the first quote_items insert in the file.
    const anchor = src.indexOf('is_estimate, estimate_basis')
    expect(anchor, 'estimated-item insert not found').toBeGreaterThan(-1)
    const stmt = src.slice(
      src.lastIndexOf('insert into quote_items', anchor),
      src.indexOf('returning', anchor),
    )
    // The column list is `(…, name, description, quantity, …)` and the matching
    // values slot for description must be a literal null, not the basis. If
    // someone reintroduces `est.basis` as the description this fails.
    expect(stmt, 'description must be null in the estimated-item insert').toMatch(
      /values\s*\([^)]*\bnull\b/,
    )
    expect(stmt, 'the basis must not appear inline in the estimated-item insert').not.toMatch(
      /Estimated from/,
    )
  })
})
