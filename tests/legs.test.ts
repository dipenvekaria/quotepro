import { describe, expect, it } from 'vitest'

import { consecutivePairs, type SchedulableJob } from '@/lib/scheduling/legs'

const at = (iso: string, extra: Partial<SchedulableJob> = {}): SchedulableJob => ({
  id: iso,
  scheduled_start: iso,
  estimated_hours: 1,
  assigned_to: 'tech-a',
  lat: 37.77,
  lng: -122.41,
  ...extra,
})

describe('consecutivePairs', () => {
  it('pairs a person’s jobs in time order regardless of input order', () => {
    const pairs = consecutivePairs([
      at('2026-08-16T15:00'),
      at('2026-08-16T09:00'),
      at('2026-08-16T12:00'),
    ])
    expect(pairs.map(([a, b]) => [a.id, b.id])).toEqual([
      ['2026-08-16T09:00', '2026-08-16T12:00'],
      ['2026-08-16T12:00', '2026-08-16T15:00'],
    ])
  })

  it('never pairs across people', () => {
    // Two technicians in different places is not a scheduling conflict, and
    // pairing them would invent one.
    const pairs = consecutivePairs([
      at('2026-08-16T09:00', { id: 'a1', assigned_to: 'tech-a' }),
      at('2026-08-16T10:00', { id: 'b1', assigned_to: 'tech-b' }),
    ])
    expect(pairs).toHaveLength(0)
  })

  it('never pairs across days', () => {
    // Last job Monday to first job Tuesday is a night's sleep, not a drive.
    const pairs = consecutivePairs([
      at('2026-08-16T16:00'),
      at('2026-08-17T09:00'),
    ])
    expect(pairs).toHaveLength(0)
  })

  it('skips unassigned jobs entirely', () => {
    // "Nobody" does not drive anywhere; pooling the unassigned pile would warn
    // about a journey no one is making.
    const pairs = consecutivePairs([
      at('2026-08-16T09:00', { id: 'u1', assigned_to: null }),
      at('2026-08-16T10:00', { id: 'u2', assigned_to: null }),
    ])
    expect(pairs).toHaveLength(0)
  })

  it('returns nothing for a single job', () => {
    expect(consecutivePairs([at('2026-08-16T09:00')])).toHaveLength(0)
  })

  it('keeps each person’s chain separate when both work the same day', () => {
    const pairs = consecutivePairs([
      at('2026-08-16T09:00', { id: 'a1', assigned_to: 'tech-a' }),
      at('2026-08-16T11:00', { id: 'a2', assigned_to: 'tech-a' }),
      at('2026-08-16T10:00', { id: 'b1', assigned_to: 'tech-b' }),
      at('2026-08-16T13:00', { id: 'b2', assigned_to: 'tech-b' }),
    ])
    expect(pairs.map(([a, b]) => `${a.id}->${b.id}`).sort()).toEqual(['a1->a2', 'b1->b2'])
  })
})
