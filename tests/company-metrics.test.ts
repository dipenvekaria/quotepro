import { describe, expect, it } from 'vitest'

import { fmtMoney, fmtRate, summarise, type MetricRow } from '@/lib/metrics/company'

const NOW = new Date('2026-08-16T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

const row = (over: Partial<MetricRow> = {}): MetricRow => ({
  id: crypto.randomUUID(),
  status: 'quote_sent',
  total: 100,
  sent_at: daysAgo(5),
  accepted_at: null,
  updated_at: null,
  ...over,
})

describe('summarise', () => {
  it('counts what was sent in the window', () => {
    const rows = [row({ sent_at: daysAgo(5) }), row({ sent_at: daysAgo(29) }), row({ sent_at: daysAgo(31) })]
    expect(summarise(rows, NOW).quotesSent).toBe(2)
  })

  it('is driven by sent_at, not created_at', () => {
    // The bug this module exists to remove: the dashboard loaded rows by
    // created_at and analytics by sent_at, so a quote drafted two months ago and
    // sent last week was in one number and missing from the other — and a
    // stalled quote that finally goes out is the case the product exists to chase.
    const stalled = row({ sent_at: daysAgo(3) })
    expect(summarise([stalled], NOW).quotesSent).toBe(1)
  })

  it('acceptance rate is a ratio of the same window', () => {
    const rows = [
      row({ sent_at: daysAgo(2), accepted_at: daysAgo(1) }),
      row({ sent_at: daysAgo(3) }),
    ]
    expect(summarise(rows, NOW).acceptanceRate).toBeCloseTo(50, 5)
  })

  it('does not divide by zero', () => {
    expect(summarise([], NOW).acceptanceRate).toBe(0)
  })

  it('revenue counts completed jobs only', () => {
    const rows = [
      row({ status: 'job_completed', total: 500, updated_at: daysAgo(2) }),
      row({ status: 'quote_sent', total: 900, updated_at: daysAgo(2) }),
    ]
    expect(summarise(rows, NOW).revenue).toBe(500)
  })
})

describe('one rendering of each number', () => {
  it('rate is whole percent on both screens', () => {
    // 71.4% against 71% was the same figure rendered twice and read as a
    // contradiction. Seven quotes do not support a decimal place.
    expect(fmtRate(71.42857)).toBe('71%')
    expect(fmtRate(0)).toBe('0%')
  })

  it('money is whole dollars, not compacted on one screen and exact on the other', () => {
    expect(fmtMoney(2471.22)).toBe('$2,471')
    expect(fmtMoney(0)).toBe('$0')
  })
})
