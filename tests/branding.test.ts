import { describe, expect, it } from 'vitest'

import { showsRivetBadge } from '@/lib/branding'

/**
 * The rule the two viewers and the two PDFs all read.
 *
 * They have to agree: a badge that vanishes from the web page and survives on
 * the PDF the customer keeps is worse than never offering to remove it.
 */
describe('showsRivetBadge', () => {
  it('shows on the free plan', () => {
    expect(showsRivetBadge('free')).toBe(true)
  })

  it('hides on a paid plan', () => {
    expect(showsRivetBadge('pro')).toBe(false)
  })

  it('shows when the plan is missing — never silently white-label for free', () => {
    // A null plan is a data problem, and the safe failure is showing the badge
    // rather than handing away the paid feature.
    expect(showsRivetBadge(null)).toBe(true)
    expect(showsRivetBadge(undefined)).toBe(true)
  })

  it('shows for an unknown plan value', () => {
    expect(showsRivetBadge('')).toBe(true)
  })

  it('hides for any future paid tier without needing a change here', () => {
    expect(showsRivetBadge('business')).toBe(false)
    expect(showsRivetBadge('enterprise')).toBe(false)
  })
})
