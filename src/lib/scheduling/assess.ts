import { query } from '@/lib/db'
import { startOfDayUtc } from '@/lib/time'
import { travelTime, type LatLng } from './travel'

/**
 * One candidate slot, judged the way Teams judges a meeting time: against the
 * person's real day. Two questions only —
 *
 *   1. Does this overlap something they already have?
 *   2. Can they physically arrive — from their previous stop, or from the
 *      office when it is the first call of the day?
 *
 * Travel numbers are the cached *typical* drive (see travel.ts for why not
 * live traffic), so feasibility carries a grace margin and the suggestion adds
 * a buffer on top rather than pretending minute precision.
 */

export type DayEvent = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  kind: 'job' | 'estimate'
  lat: number | null
  lng: number | null
}

export type SlotAssessment = {
  /** The person's other bookings that day, in order — the at-a-glance day. */
  day: DayEvent[]
  /** Events the candidate slot overlaps. Empty means no double-booking. */
  conflicts: DayEvent[]
  travel: {
    fromLabel: string
    minutes: number
    /** Earliest they can be on site: previous stop's end + typical drive. */
    arriveBy: string
    /** Negative when the drive lands them after the chosen start. */
    slackMinutes: number
    feasible: boolean
  } | null
  /** Earliest clean start when the slot conflicts or cannot be reached. */
  suggestion: string | null
}

/** Estimates and unquoted jobs still occupy time; an hour is the least dishonest guess. */
const DEFAULT_HOURS = 1
/** Typical-drive numbers deserve a little forgiveness before we cry infeasible. */
const GRACE_MINUTES = 5
/** And the fix we suggest adds a real buffer, not a photo finish. */
const BUFFER_MINUTES = 10

function roundUpToQuarter(t: number): Date {
  const q = 15 * 60_000
  return new Date(Math.ceil(t / q) * q)
}

async function loadDay(
  companyId: string,
  assigneeId: string,
  dayStart: Date,
  dayEnd: Date,
  excludeId: string,
): Promise<DayEvent[]> {
  const [jobs, estimates] = await Promise.all([
    query<{
      id: string
      title: string | null
      customer_name: string | null
      scheduled_start: string
      estimated_hours: number | null
      lat: number | null
      lng: number | null
    }>(
      `select w.id, coalesce(w.job_name, w.description) as title,
              c.name as customer_name, w.scheduled_start, w.estimated_hours,
              a.lat, a.lng
         from work_items w
         left join customers c on c.id = w.customer_id
         left join customer_addresses a on a.id = w.address_id
        where w.company_id = $1 and w.assigned_to = $2 and w.id <> $5
          and w.status in ('job_scheduled', 'job_in_progress', 'job_completed')
          and w.scheduled_start >= $3 and w.scheduled_start < $4`,
      [companyId, assigneeId, dayStart.toISOString(), dayEnd.toISOString(), excludeId],
    ),
    query<{
      id: string
      customer_name: string | null
      estimate_scheduled_start: string
      lat: number | null
      lng: number | null
    }>(
      `select w.id, c.name as customer_name, w.estimate_scheduled_start, a.lat, a.lng
         from work_items w
         left join customers c on c.id = w.customer_id
         left join customer_addresses a on a.id = w.address_id
        where w.company_id = $1 and w.estimate_assigned_to = $2 and w.id <> $5
          and w.status = 'estimate_scheduled'
          and w.estimate_scheduled_start >= $3 and w.estimate_scheduled_start < $4`,
      [companyId, assigneeId, dayStart.toISOString(), dayEnd.toISOString(), excludeId],
    ),
  ])

  const events: DayEvent[] = [
    ...jobs.map((j) => {
      const hours = j.estimated_hours && j.estimated_hours > 0 ? Number(j.estimated_hours) : DEFAULT_HOURS
      const start = new Date(j.scheduled_start)
      return {
        id: j.id,
        title: j.customer_name ?? j.title ?? 'Job',
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + hours * 3_600_000).toISOString(),
        kind: 'job' as const,
        lat: j.lat,
        lng: j.lng,
      }
    }),
    ...estimates.map((e) => {
      const start = new Date(e.estimate_scheduled_start)
      return {
        id: e.id,
        title: e.customer_name ?? 'Estimate visit',
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + DEFAULT_HOURS * 3_600_000).toISOString(),
        kind: 'estimate' as const,
        lat: e.lat,
        lng: e.lng,
      }
    }),
  ]
  events.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return events
}

/**
 * The office, as coordinates — geocoded once and cached on the company row,
 * keyed to the exact address text so an edited address re-geocodes itself.
 * Null when there is no address, no key, or Google cannot place it: silence,
 * never a guess.
 */
async function officeGeo(companyId: string): Promise<(LatLng & { label: string }) | null> {
  const [co] = await query<{
    address: string | null
    settings: { office_geo?: { lat: number; lng: number; for: string } } | null
  }>('select address, settings from companies where id = $1 limit 1', [companyId])
  const address = co?.address?.trim()
  if (!address) return null

  const cached = co?.settings?.office_geo
  if (cached && cached.for === address) return { lat: cached.lat, lng: cached.lng, label: 'the office' }

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[]
    }
    const loc = data.results?.[0]?.geometry?.location
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null

    await query(
      `update companies
          set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('office_geo',
              jsonb_build_object('lat', $2::float, 'lng', $3::float, 'for', $4::text))
        where id = $1`,
      [companyId, loc.lat, loc.lng, address],
    ).catch((e) => console.error('office geo not cached', e))

    return { lat: loc.lat, lng: loc.lng, label: 'the office' }
  } catch (e) {
    console.error('office geocode threw', e)
    return null
  }
}

export async function assessSlot(input: {
  companyId: string
  workItemId: string
  assigneeId: string
  startsAt: Date
  hours: number | null
  tz: string
  siteLat: number | null
  siteLng: number | null
}): Promise<SlotAssessment> {
  const dayStart = startOfDayUtc(input.tz, input.startsAt)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
  const day = await loadDay(input.companyId, input.assigneeId, dayStart, dayEnd, input.workItemId)

  const hours = input.hours && input.hours > 0 ? input.hours : DEFAULT_HOURS
  const start = input.startsAt.getTime()
  const end = start + hours * 3_600_000

  const conflicts = day.filter(
    (e) => new Date(e.startsAt).getTime() < end && new Date(e.endsAt).getTime() > start,
  )

  // Where are they coming from? The last stop that ends before this one
  // starts; failing that, the office.
  let travel: SlotAssessment['travel'] = null
  if (typeof input.siteLat === 'number' && typeof input.siteLng === 'number') {
    const prev = [...day].reverse().find((e) => new Date(e.endsAt).getTime() <= start)
    const origin: (LatLng & { label: string }) | null =
      prev && typeof prev.lat === 'number' && typeof prev.lng === 'number'
        ? { lat: prev.lat, lng: prev.lng, label: prev.title }
        : prev
          ? null // they are somewhere we cannot place; silence beats a guess from the office
          : await officeGeo(input.companyId)

    if (origin) {
      const est = await travelTime(origin, { lat: input.siteLat, lng: input.siteLng })
      if (est) {
        const minutes = Math.ceil(est.seconds / 60)
        const departAt = prev ? new Date(prev.endsAt).getTime() : start - minutes * 60_000
        const arriveBy = prev ? new Date(prev.endsAt).getTime() + est.seconds * 1000 : start
        const slackMinutes = Math.round((start - arriveBy) / 60_000)
        travel = {
          fromLabel: origin.label,
          minutes,
          arriveBy: new Date(arriveBy).toISOString(),
          slackMinutes: prev ? slackMinutes : 0,
          feasible: !prev || slackMinutes >= -GRACE_MINUTES,
        }
        void departAt
      }
    }
  }

  let suggestion: string | null = null
  if (conflicts.length > 0 || (travel && !travel.feasible)) {
    const conflictFloor = conflicts.length
      ? Math.max(...conflicts.map((c) => new Date(c.endsAt).getTime()))
      : 0
    const travelFloor = travel && !travel.feasible ? new Date(travel.arriveBy).getTime() : 0
    const floor = Math.max(conflictFloor, travelFloor, start)
    suggestion = roundUpToQuarter(floor + BUFFER_MINUTES * 60_000).toISOString()
  }

  return { day, conflicts, travel, suggestion }
}
