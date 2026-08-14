import { describe, expect, it } from 'vitest'

import {
  DEFAULT_HOURS,
  bookedHoursOn,
  capacityOn,
  suggestSlots,
  type Booking,
} from '../src/lib/scheduling/slots'

/**
 * Slot suggestions are the feature. A suggestion that collides with an existing
 * job, or lands outside working hours, is worse than no suggestion at all — the
 * contractor stops trusting the button and goes back to typing a date.
 */

// A Monday, well in the future so "never suggest the past" doesn't interfere.
const MON = new Date('2027-03-01T00:00:00')

function booking(startIso: string, hours: number, assignedTo: string | null = null): Booking {
  const start = new Date(startIso)
  return {
    id: startIso,
    title: 'Job',
    customerName: null,
    assignedTo,
    start,
    end: new Date(start.getTime() + hours * 3600_000),
    estimatedHours: hours,
  }
}

describe('suggestSlots', () => {
  it('offers the start of the working day when nothing is booked', () => {
    const [slot] = suggestSlots({ hours: 2, bookings: [], businessHours: DEFAULT_HOURS, from: MON })
    expect(slot.start.getHours()).toBe(8)
    expect(slot.end.getHours()).toBe(10)
  })

  it('never overlaps an existing job', () => {
    const bookings = [booking('2027-03-01T08:00:00', 3)]
    const [slot] = suggestSlots({ hours: 2, bookings, businessHours: DEFAULT_HOURS, from: MON })
    expect(slot.start.getTime()).toBeGreaterThanOrEqual(bookings[0].end.getTime())
  })

  it('skips a day that cannot fit the job and moves to the next', () => {
    // 08:00-17:00 is 9 hours; an 8-hour booking leaves only 1.
    const bookings = [booking('2027-03-01T08:00:00', 8)]
    const [slot] = suggestSlots({ hours: 4, bookings, businessHours: DEFAULT_HOURS, from: MON })
    expect(slot.start.getDate()).toBe(2) // Tuesday
  })

  it('never suggests a slot that runs past closing', () => {
    for (const s of suggestSlots({ hours: 3, bookings: [], businessHours: DEFAULT_HOURS, from: MON })) {
      expect(s.end.getHours()).toBeLessThanOrEqual(17)
    }
  })

  it('skips closed days entirely', () => {
    // Saturday and Sunday are null in DEFAULT_HOURS.
    const sat = new Date('2027-03-06T00:00:00')
    const [slot] = suggestSlots({ hours: 2, bookings: [], businessHours: DEFAULT_HOURS, from: sat })
    expect([1, 8]).toContain(slot.start.getDate()) // the following Monday
    expect(slot.start.getDay()).toBe(1)
  })

  it('gives one suggestion per day rather than three on the same morning', () => {
    const slots = suggestSlots({ hours: 1, bookings: [], businessHours: DEFAULT_HOURS, from: MON })
    const days = new Set(slots.map((s) => s.start.toDateString()))
    expect(days.size).toBe(slots.length)
  })

  it("only counts the assigned tech's bookings when one is named", () => {
    const bookings = [booking('2027-03-01T08:00:00', 8, 'tech-a')]
    const [forB] = suggestSlots({
      hours: 4, bookings, businessHours: DEFAULT_HOURS, from: MON, assignedTo: 'tech-b',
    })
    // Tech B's Monday is free even though Tech A is fully booked.
    expect(forB.start.getDate()).toBe(1)
  })

  it('respects a shortened day', () => {
    const short = { ...DEFAULT_HOURS, mon: { start: '09:00', end: '12:00' } }
    const [slot] = suggestSlots({ hours: 2, bookings: [], businessHours: short, from: MON })
    expect(slot.start.getHours()).toBe(9)
    expect(slot.end.getHours()).toBe(11)
  })

  it('returns nothing when the job is longer than any working day', () => {
    const slots = suggestSlots({ hours: 12, bookings: [], businessHours: DEFAULT_HOURS, from: MON })
    expect(slots).toHaveLength(0)
  })
})

describe('capacity', () => {
  it('reports the working length of a day', () => {
    expect(capacityOn(MON, DEFAULT_HOURS)).toBe(9)
  })

  it('reports zero for a closed day', () => {
    expect(capacityOn(new Date('2027-03-06T00:00:00'), DEFAULT_HOURS)).toBe(0)
  })

  it('sums what is already booked', () => {
    const bookings = [booking('2027-03-01T08:00:00', 3), booking('2027-03-01T13:00:00', 2)]
    expect(bookedHoursOn(MON, bookings)).toBe(5)
  })
})
