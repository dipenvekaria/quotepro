/**
 * Day boundaries in the contractor's timezone.
 *
 * Vercel runs UTC, so `new Date().setHours(0,0,0,0)` is midnight in London,
 * not in the contractor's driveway. From mid-afternoon onward every US
 * dashboard showed tomorrow's date, "Today's schedule" queried tomorrow's
 * jobs, and the greeting said good evening at 7am. `companies.settings`
 * carried a timezone the whole time; nothing read it.
 *
 * Pure Intl — no dependency. The only correct way to do calendar arithmetic
 * in a foreign zone without a library is to format an instant *in* that zone
 * and read the parts back, so that is what everything here does.
 */

export const FALLBACK_TZ = 'America/Chicago'

/** A usable IANA zone from company settings, or the fallback. */
export function companyTz(settings: unknown): string {
  const tz =
    settings && typeof settings === 'object' && 'timezone' in settings
      ? (settings as { timezone?: unknown }).timezone
      : null
  if (typeof tz !== 'string' || !tz) return FALLBACK_TZ
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return FALLBACK_TZ
  }
}

type Parts = { y: number; m: number; d: number; h: number; min: number }

export function zonedParts(instant: Date, tz: string): Parts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') }
}

/** The calendar day an instant falls on in `tz`, as `YYYY-MM-DD`. */
export function zonedDayKey(instant: Date | string, tz: string): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  const p = zonedParts(d, tz)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** The hour of the day (0–23) an instant falls at in `tz`. */
export function zonedHour(instant: Date | string, tz: string): number {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  return zonedParts(d, tz).h
}

/**
 * The UTC instant at which `ref`'s calendar day begins in `tz`.
 *
 * Guess-and-correct: pretend the zone's wall-clock date is UTC, see what that
 * instant reads as in the zone, and shift by the difference. One correction
 * lands except across a DST jump, so it corrects twice.
 */
export function startOfDayUtc(tz: string, ref: Date = new Date()): Date {
  const day = zonedParts(ref, tz)
  let guess = new Date(Date.UTC(day.y, day.m - 1, day.d, 0, 0, 0, 0))
  for (let i = 0; i < 2; i++) {
    const shown = zonedParts(guess, tz)
    const diffMin =
      (Date.UTC(shown.y, shown.m - 1, shown.d, shown.h, shown.min) -
        Date.UTC(day.y, day.m - 1, day.d, 0, 0)) /
      60_000
    if (diffMin === 0) break
    guess = new Date(guess.getTime() - diffMin * 60_000)
  }
  return guess
}

/**
 * [start, end) of `ref`'s calendar day in `tz`, as UTC instants.
 *
 * The end is the *next* day's start computed properly, not start+24h — a DST
 * day is 23 or 25 hours long and the naive add drops or double-counts an hour
 * of jobs twice a year.
 */
export function dayRangeUtc(tz: string, ref: Date = new Date()): { start: Date; end: Date } {
  const start = startOfDayUtc(tz, ref)
  const end = startOfDayUtc(tz, new Date(start.getTime() + 30 * 3_600_000))
  return { start, end }
}
