/**
 * Slot maths for scheduling — pure, no database.
 *
 * Every competitor asks a dispatcher how long a job takes, because their price
 * book is a name and a price. Ours carries `labor_hours` per catalog item, so
 * an accepted quote already knows — and that is the only reason any of this is
 * meaningful. "Thursday has six hours free" is worth nothing if job lengths are
 * guesses.
 *
 * Kept free of imports so the maths is testable without a database, which is
 * also why the loaders live next door in availability.ts.
 */

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export type DayHours = { start: string; end: string } | null
export type BusinessHours = Record<DayKey, DayHours>

export const DEFAULT_HOURS: BusinessHours = {
  mon: { start: '08:00', end: '17:00' },
  tue: { start: '08:00', end: '17:00' },
  wed: { start: '08:00', end: '17:00' },
  thu: { start: '08:00', end: '17:00' },
  fri: { start: '08:00', end: '17:00' },
  sat: null,
  sun: null,
}

export type Booking = {
  id: string
  title: string
  customerName: string | null
  assignedTo: string | null
  start: Date
  /** Derived from estimated_hours; falls back to a nominal block when unknown. */
  end: Date
  estimatedHours: number | null
}

export type Slot = {
  start: Date
  end: Date
  /** Null means nobody is assigned yet — any tech could take it. */
  assignedTo: string | null
}

/** What a job occupies when nothing tells us its length. */
export const NOMINAL_JOB_HOURS = 2

// ---------------------------------------------------------------------------
// Slot maths
// ---------------------------------------------------------------------------

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * The earliest slots that fit a job of `hours`, inside working hours, without
 * colliding with what is already booked.
 *
 * Deliberately does not try to be clever about travel or clustering. A wrong
 * suggestion a contractor has to undo is worse than an obvious one they accept,
 * and route optimisation is a different problem that matters at a fleet size
 * this product is not aimed at.
 */
export function suggestSlots(opts: {
  hours: number
  bookings: Booking[]
  businessHours: BusinessHours
  /** Search starts here, rounded up to the next half hour. */
  from: Date
  daysAhead?: number
  limit?: number
  /** When set, only that tech's bookings block a slot. */
  assignedTo?: string | null
}): Slot[] {
  const { hours, bookings, businessHours } = opts
  const limit = opts.limit ?? 3
  const daysAhead = opts.daysAhead ?? 14
  const durationMs = Math.max(hours, 0.25) * 3600_000

  const relevant = opts.assignedTo
    ? bookings.filter((b) => b.assignedTo === opts.assignedTo)
    : bookings

  // Never suggest a time that has already passed.
  const earliest = new Date(Math.max(opts.from.getTime(), Date.now()))
  earliest.setMinutes(earliest.getMinutes() > 30 ? 60 : 30, 0, 0)

  const out: Slot[] = []

  for (let d = 0; d < daysAhead && out.length < limit; d++) {
    const day = new Date(earliest)
    day.setDate(day.getDate() + d)

    const hoursForDay = businessHours[DAY_KEYS[day.getDay()]]
    if (!hoursForDay) continue

    const open = atTime(day, hoursForDay.start)
    const close = atTime(day, hoursForDay.end)

    let cursor = d === 0 && earliest > open ? new Date(earliest) : new Date(open)

    while (cursor.getTime() + durationMs <= close.getTime() && out.length < limit) {
      const end = new Date(cursor.getTime() + durationMs)
      const clash = relevant.find((b) => overlaps(cursor, end, b.start, b.end))

      if (!clash) {
        out.push({ start: new Date(cursor), end, assignedTo: opts.assignedTo ?? null })
        // One suggestion per day. Three slots on the same Tuesday is not a
        // choice, it is the same answer three times.
        break
      }
      // Jump to the end of whatever is in the way rather than crawling.
      cursor = new Date(Math.ceil(clash.end.getTime() / 1800_000) * 1800_000)
    }
  }

  return out
}

/** Hours already booked on a given day, for the capacity read-out. */
export function bookedHoursOn(day: Date, bookings: Booking[]): number {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  return bookings
    .filter((b) => overlaps(b.start, b.end, dayStart, dayEnd))
    .reduce((sum, b) => sum + (b.end.getTime() - b.start.getTime()) / 3600_000, 0)
}

/** Working hours available on a day, before anything is booked. */
export function capacityOn(day: Date, businessHours: BusinessHours): number {
  const h = businessHours[DAY_KEYS[day.getDay()]]
  if (!h) return 0
  return (atTime(day, h.end).getTime() - atTime(day, h.start).getTime()) / 3600_000
}
