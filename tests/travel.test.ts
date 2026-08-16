import { describe, expect, it } from 'vitest'

import { coordKey, formatTravel, haversineKm, isImpossible } from '@/lib/scheduling/travel'

/**
 * The pure parts of travel estimation. `travelTime` itself hits Postgres and
 * Google, so it is covered by the integration path rather than here — but the
 * arithmetic below decides whether a contractor gets warned that their day is
 * impossible, and that is worth pinning down.
 */

describe('coordKey', () => {
  it('rounds to ~11 metres so a street shares one cache entry', () => {
    // Two doors on the same block must not each cost a billed lookup.
    expect(coordKey({ lat: 37.774929, lng: -122.419418 })).toBe('37.7749,-122.4194')
    expect(coordKey({ lat: 37.77491, lng: -122.41939 })).toBe('37.7749,-122.4194')
  })

  it('keeps genuinely different places apart', () => {
    expect(coordKey({ lat: 37.7749, lng: -122.4194 })).not.toBe(
      coordKey({ lat: 37.8044, lng: -122.2712 }),
    )
  })

  it('is stable across the sign of the coordinate', () => {
    expect(coordKey({ lat: -33.8688, lng: 151.2093 })).toBe('-33.8688,151.2093')
  })
})

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 37.7749, lng: -122.4194 }, { lat: 37.7749, lng: -122.4194 })).toBe(0)
  })

  it('gets San Francisco to Oakland about right', () => {
    // ~13 km straight line. The guard only needs the order of magnitude.
    const d = haversineKm({ lat: 37.7749, lng: -122.4194 }, { lat: 37.8044, lng: -122.2712 })
    expect(d).toBeGreaterThan(11)
    expect(d).toBeLessThan(15)
  })

  it('is symmetric', () => {
    const a = { lat: 37.7749, lng: -122.4194 }
    const b = { lat: 34.0522, lng: -118.2437 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
  })
})

describe('formatTravel', () => {
  it.each([
    [0, 'next door'],
    [25, 'next door'],
    [90, '2 min'],
    [1500, '25 min'],
    [3600, '1h'],
    [4200, '1h 10m'],
  ])('%i seconds reads as %s', (secs, expected) => {
    expect(formatTravel(secs)).toBe(expected)
  })
})

describe('isImpossible', () => {
  const travel = (mins: number) => ({ seconds: mins * 60, meters: null, source: 'cache' as const })

  it('flags a gap shorter than the drive', () => {
    // The case this feature exists for: ten minutes to make a forty minute
    // drive. Invisible on a calendar that only draws blocks.
    expect(isImpossible({ gapMinutes: 10, travel: travel(40) })).toBe(true)
  })

  it('accepts a gap that fits', () => {
    expect(isImpossible({ gapMinutes: 45, travel: travel(40) })).toBe(false)
  })

  it('treats exactly enough time as possible, not impossible', () => {
    // Warning on a schedule that technically works would train people to
    // ignore the warning.
    expect(isImpossible({ gapMinutes: 40, travel: travel(40) })).toBe(false)
  })

  it('flags back-to-back jobs that are not next door', () => {
    expect(isImpossible({ gapMinutes: 0, travel: travel(15) })).toBe(true)
  })

  it('does not flag back-to-back jobs at the same address', () => {
    expect(isImpossible({ gapMinutes: 0, travel: travel(0) })).toBe(false)
  })

  it('flags an overlapping schedule', () => {
    // Negative gap: the next job starts before this one ends.
    expect(isImpossible({ gapMinutes: -30, travel: travel(5) })).toBe(true)
  })
})
