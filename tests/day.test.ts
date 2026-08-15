import { describe, expect, it } from 'vitest'

import { dayKey, moveToDay } from '@/lib/scheduling/day'

/**
 * These run in the machine's timezone, so they assert relationships rather than
 * literal strings — a test that only passes in America/Los_Angeles is worse than
 * no test, because it goes green in CI for the wrong reason.
 */

describe('dayKey', () => {
  it('is the local day, not the UTC day', () => {
    // Late evening local. Anywhere west of Greenwich this is already tomorrow in
    // UTC, which is exactly the bug: the calendar drew the job a column late.
    const evening = new Date(2026, 7, 12, 21, 56)
    expect(dayKey(evening)).toBe('2026-08-12')
    if (evening.getTimezoneOffset() > 0) {
      expect(dayKey(evening)).not.toBe(evening.toISOString().slice(0, 10))
    }
  })

  it('is the local day for early morning too', () => {
    // The mirror case, for positive offsets: 00:30 local is yesterday in UTC.
    expect(dayKey(new Date(2026, 7, 12, 0, 30))).toBe('2026-08-12')
  })

  it('zero-pads so keys sort and compare as strings', () => {
    expect(dayKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05')
  })

  it('accepts the ISO strings the server sends', () => {
    const d = new Date(2026, 7, 12, 21, 56)
    expect(dayKey(d.toISOString())).toBe(dayKey(d))
  })

  it('agrees with itself across a round trip, which is what the board relies on', () => {
    // Columns come from one call and jobs from another; if these ever disagree a
    // job is undraggable onto its own day.
    for (let h = 0; h < 24; h++) {
      const d = new Date(2026, 7, 12, h, 30)
      expect(dayKey(d.toISOString())).toBe(dayKey(d))
    }
  })
})

describe('moveToDay', () => {
  it('keeps the time of day', () => {
    const moved = moveToDay(new Date(2026, 7, 12, 9, 15), '2026-08-13')
    expect(moved.getHours()).toBe(9)
    expect(moved.getMinutes()).toBe(15)
  })

  it('lands on the day asked for', () => {
    expect(dayKey(moveToDay(new Date(2026, 7, 12, 21, 56), '2026-08-13'))).toBe('2026-08-13')
  })

  it('moves an evening job to the right day — the case that was broken', () => {
    const evening = new Date(2026, 7, 12, 21, 56)
    expect(dayKey(moveToDay(evening, '2026-08-14'))).toBe('2026-08-14')
  })

  it('crosses months', () => {
    expect(dayKey(moveToDay(new Date(2026, 7, 31, 8, 0), '2026-09-01'))).toBe('2026-09-01')
  })

  it('moves the 31st into a 30-day month without rolling over', () => {
    // Setting the month before the date would give October 1st here.
    expect(dayKey(moveToDay(new Date(2026, 7, 31, 8, 0), '2026-09-30'))).toBe('2026-09-30')
  })

  it('crosses years', () => {
    expect(dayKey(moveToDay(new Date(2026, 11, 31, 16, 0), '2027-01-02'))).toBe('2027-01-02')
  })

  it('does not mutate the original', () => {
    const original = new Date(2026, 7, 12, 9, 0)
    moveToDay(original, '2026-08-20')
    expect(dayKey(original)).toBe('2026-08-12')
  })
})
