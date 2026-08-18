import { describe, expect, it } from 'vitest'

import { companyTz, dayRangeUtc, startOfDayUtc, zonedDayKey, zonedHour } from '@/lib/time'

/**
 * The server runs UTC and the contractor does not. Every case here is a fixed
 * instant with a hand-checked answer, including both DST transitions — the
 * two nights a year when start+24h is the wrong end of the day.
 */

describe('zonedDayKey / zonedHour', () => {
  it('an evening job in Chicago is still today, not UTC-tomorrow', () => {
    // 2026-08-18 03:00 UTC == 2026-08-17 22:00 CDT
    const instant = new Date('2026-08-18T03:00:00Z')
    expect(zonedDayKey(instant, 'America/Chicago')).toBe('2026-08-17')
    expect(zonedHour(instant, 'America/Chicago')).toBe(22)
    // …while UTC (and the old code) called it the 18th.
    expect(zonedDayKey(instant, 'UTC')).toBe('2026-08-18')
  })

  it('midnight boundaries land on the right side', () => {
    // 04:59 UTC is 23:59 in Chicago; 05:00 is midnight, the next day.
    expect(zonedDayKey(new Date('2026-08-18T04:59:00Z'), 'America/Chicago')).toBe('2026-08-17')
    expect(zonedDayKey(new Date('2026-08-18T05:00:00Z'), 'America/Chicago')).toBe('2026-08-18')
  })
})

describe('startOfDayUtc', () => {
  it('Chicago in summer: midnight CDT is 05:00 UTC', () => {
    const s = startOfDayUtc('America/Chicago', new Date('2026-08-18T12:00:00Z'))
    expect(s.toISOString()).toBe('2026-08-18T05:00:00.000Z')
  })

  it('Chicago in winter: midnight CST is 06:00 UTC', () => {
    const s = startOfDayUtc('America/Chicago', new Date('2026-12-10T12:00:00Z'))
    expect(s.toISOString()).toBe('2026-12-10T06:00:00.000Z')
  })

  it('Los Angeles and New York disagree by three hours, as they should', () => {
    const ref = new Date('2026-08-18T12:00:00Z')
    const la = startOfDayUtc('America/Los_Angeles', ref)
    const ny = startOfDayUtc('America/New_York', ref)
    expect((la.getTime() - ny.getTime()) / 3_600_000).toBe(3)
  })
})

describe('dayRangeUtc across DST', () => {
  it('the fall-back day is 25 hours long', () => {
    // US DST ends 2026-11-01 in America/Chicago.
    const { start, end } = dayRangeUtc('America/Chicago', new Date('2026-11-01T12:00:00Z'))
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25)
  })

  it('the spring-forward day is 23 hours long', () => {
    // US DST begins 2026-03-08.
    const { start, end } = dayRangeUtc('America/Chicago', new Date('2026-03-08T12:00:00Z'))
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23)
  })

  it('an ordinary day is 24', () => {
    const { start, end } = dayRangeUtc('America/Chicago', new Date('2026-08-18T12:00:00Z'))
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(24)
  })
})

describe('companyTz', () => {
  it('reads settings, rejects junk, falls back', () => {
    expect(companyTz({ timezone: 'America/Denver' })).toBe('America/Denver')
    expect(companyTz({ timezone: 'Not/AZone' })).toBe('America/Chicago')
    expect(companyTz({})).toBe('America/Chicago')
    expect(companyTz(null)).toBe('America/Chicago')
  })
})
