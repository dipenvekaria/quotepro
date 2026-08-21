import { describe, expect, it } from 'vitest'

import { LIMITS } from '@/lib/rate-limit'

/**
 * The behaviour of the limiter is exercised against Postgres in the integration
 * path — the atomicity is the whole point and cannot be tested without a
 * database. These pin the ceilings, which are a judgement call worth making
 * visible rather than a detail buried in a file.
 */

describe('rate limits', () => {
  it('are set above what a real person reaches', () => {
    // A limit tight enough to catch a legitimate user is a limit that gets
    // removed the first time it fires on a customer.
    expect(LIMITS.quoteAction.limit).toBeGreaterThanOrEqual(10)
    expect(LIMITS.checkout.limit).toBeGreaterThanOrEqual(10)
    expect(LIMITS.waitlist.limit).toBeLessThanOrEqual(10)
    expect(LIMITS.aiGenerate.limit).toBeGreaterThanOrEqual(30)
  })

  it('are stricter where the call costs more', () => {
    // Reading a scanned price book is many pages of vision tokens; drafting is
    // one small completion. The ceilings should reflect that.
    expect(LIMITS.aiExtract.limit).toBeLessThan(LIMITS.aiGenerate.limit)
  })

  it('use windows long enough to matter', () => {
    for (const [name, l] of Object.entries(LIMITS)) {
      expect(l.windowSeconds, name).toBeGreaterThanOrEqual(600)
    }
  })
})
