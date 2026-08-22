import { query } from '@/lib/db'
import { startOfDayUtc, zonedParts, zonedToUtc } from '@/lib/time'
import { officeGeo } from './assess'
import { haversineKm, travelTime, type LatLng } from './travel'
import type { BusinessHours, DayKey } from './slots'

/**
 * Who can take this job, and when — the person-first answer.
 *
 * The old slot list computed windows with server-local Date math, which on
 * Vercel meant UTC: a 9:00 open rendered as "3:00 AM" on the owner's phone.
 * Everything here goes through the company-timezone helpers instead, and the
 * output is organised the way dispatch actually thinks: by teammate, with
 * their first workable windows, the typical drive, and whether they are
 * already near the site that day.
 *
 * Deliberately not a model call. Availability is exact arithmetic over
 * calendars, hours, and the cached drive matrix; an LLM could only paraphrase
 * it more slowly.
 */

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** "Already in the area" — close enough that the drive is a rounding error. */
const NEARBY_KM = 8
/** Suggested starts land on the half hour. */
const SNAP_MS = 30 * 60_000
const DEFAULT_EVENT_HOURS = 1
/** Cushion between the predicted arrival and the suggested start. */
const BUFFER_MS = 10 * 60_000

type TeamEvent = {
  assignee: string
  start: number
  end: number
  lat: number | null
  lng: number | null
  customer: string | null
}

export type PersonOption = {
  startsAt: string
  endsAt: string
  /** Typical minutes from wherever they are beforehand; null when unknowable. */
  travelMinutes: number | null
  /** Where that drive starts: a customer's name, or 'the office'. */
  fromLabel: string | null
  nearby: boolean
}

export type PersonAvailability = {
  id: string
  name: string
  role: string
  options: PersonOption[]
  /** They already have a stop near this site on the day of their first option. */
  nearby: boolean
}

async function loadTeamEvents(
  companyId: string,
  assignees: string[],
  from: Date,
  to: Date,
  excludeId: string,
): Promise<TeamEvent[]> {
  const [jobs, estimates] = await Promise.all([
    query<{
      assigned_to: string
      scheduled_start: string
      estimated_hours: number | null
      lat: number | null
      lng: number | null
      customer_name: string | null
    }>(
      `select w.assigned_to, w.scheduled_start, w.estimated_hours, a.lat, a.lng,
              c.name as customer_name
         from work_items w
         left join customers c on c.id = w.customer_id
         left join customer_addresses a on a.id = w.address_id
        where w.company_id = $1 and w.assigned_to = any($2::uuid[]) and w.id <> $5
          and w.status in ('job_scheduled', 'job_in_progress')
          and w.scheduled_start >= $3 and w.scheduled_start < $4`,
      [companyId, assignees, from.toISOString(), to.toISOString(), excludeId],
    ),
    query<{
      estimate_assigned_to: string
      estimate_scheduled_start: string
      lat: number | null
      lng: number | null
      customer_name: string | null
    }>(
      `select w.estimate_assigned_to, w.estimate_scheduled_start, a.lat, a.lng,
              c.name as customer_name
         from work_items w
         left join customers c on c.id = w.customer_id
         left join customer_addresses a on a.id = w.address_id
        where w.company_id = $1 and w.estimate_assigned_to = any($2::uuid[]) and w.id <> $5
          and w.status = 'estimate_scheduled' and w.estimate_scheduled_start is not null
          and w.estimate_scheduled_start >= $3 and w.estimate_scheduled_start < $4`,
      [companyId, assignees, from.toISOString(), to.toISOString(), excludeId],
    ),
  ])

  const events: TeamEvent[] = []
  for (const j of jobs) {
    const start = new Date(j.scheduled_start).getTime()
    const hours = j.estimated_hours && j.estimated_hours > 0 ? Number(j.estimated_hours) : DEFAULT_EVENT_HOURS
    events.push({ assignee: j.assigned_to, start, end: start + hours * 3600_000, lat: j.lat, lng: j.lng, customer: j.customer_name })
  }
  for (const e of estimates) {
    const start = new Date(e.estimate_scheduled_start).getTime()
    events.push({ assignee: e.estimate_assigned_to, start, end: start + DEFAULT_EVENT_HOURS * 3600_000, lat: e.lat, lng: e.lng, customer: e.customer_name })
  }
  events.sort((a, b) => a.start - b.start)
  return events
}

export async function teamAvailability(input: {
  companyId: string
  workItemId: string
  tz: string
  hours: BusinessHours
  roles: string[]
  durationHours: number
  siteLat: number | null
  siteLng: number | null
  days?: number
  optionsPerPerson?: number
}): Promise<PersonAvailability[]> {
  const days = input.days ?? 10
  const perPerson = input.optionsPerPerson ?? 2

  const people = await query<{ id: string; name: string | null; role: string }>(
    `select u.id, u.role,
            coalesce(u.profile->>'full_name',
              nullif(trim(concat(u.profile->>'first_name', ' ', u.profile->>'last_name')), ''),
              split_part(au.email, '@', 1)) as name
       from users u
       join auth.users au on au.id = u.id
      where u.company_id = $1 and u.is_active and u.role::text = any($2::text[])
      order by u.created_at asc`,
    [input.companyId, input.roles],
  )
  if (people.length === 0) return []

  const rangeStart = startOfDayUtc(input.tz, new Date())
  const rangeEnd = startOfDayUtc(input.tz, new Date(rangeStart.getTime() + (days + 1) * 26 * 3600_000))
  const events = await loadTeamEvents(
    input.companyId,
    people.map((p) => p.id),
    rangeStart,
    rangeEnd,
    input.workItemId,
  )

  const site: LatLng | null =
    typeof input.siteLat === 'number' && typeof input.siteLng === 'number'
      ? { lat: input.siteLat, lng: input.siteLng }
      : null
  const office = site ? await officeGeo(input.companyId) : null
  const durationMs = Math.max(0.5, input.durationHours) * 3600_000
  const now = Date.now()

  const out: PersonAvailability[] = []
  for (const person of people) {
    const mine = events.filter((e) => e.assignee === person.id)
    const options: PersonOption[] = []
    let personNearby = false

    for (let d = 0; d < days && options.length < perPerson; d++) {
      const dayStart = startOfDayUtc(input.tz, new Date(rangeStart.getTime() + d * 26 * 3600_000 + 3600_000))
      const p = zonedParts(dayStart, input.tz)
      const weekday = DAY_KEYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]
      const window = input.hours[weekday]
      if (!window) continue

      const [oh, om] = window.start.split(':').map(Number)
      const [ch, cm] = window.end.split(':').map(Number)
      const open = zonedToUtc(input.tz, { y: p.y, m: p.m, d: p.d, h: oh, min: om ?? 0 }).getTime()
      const close = zonedToUtc(input.tz, { y: p.y, m: p.m, d: p.d, h: ch, min: cm ?? 0 }).getTime()
      if (close <= now) continue

      const dayEvents = mine.filter((e) => e.end > open && e.start < close)
      const nearbyStop = site
        ? dayEvents.find(
            (e) => typeof e.lat === 'number' && typeof e.lng === 'number' &&
              haversineKm({ lat: e.lat, lng: e.lng }, site) <= NEARBY_KM,
          )
        : undefined

      // Walk the gaps.
      let cursor = Math.max(open, Math.ceil(now / SNAP_MS) * SNAP_MS)
      let placed = false
      for (const e of [...dayEvents, { start: close, end: close, lat: null, lng: null, customer: null, assignee: person.id }]) {
        if (placed) break
        const gapEnd = Math.min(e.start, close)
        if (gapEnd - cursor >= durationMs) {
          let start = cursor
          let travelMinutes: number | null = null
          let fromLabel: string | null = null

          if (site) {
            const prev = [...dayEvents].reverse().find((ev) => ev.end <= cursor)
            const origin =
              prev && typeof prev.lat === 'number' && typeof prev.lng === 'number'
                ? { lat: prev.lat, lng: prev.lng, label: prev.customer ?? 'their previous stop' }
                : prev
                  ? null // somewhere unmappable: say nothing rather than guess
                  : office
            if (origin) {
              const est = await travelTime(origin, site)
              if (est) {
                travelMinutes = Math.ceil(est.seconds / 60)
                fromLabel = origin.label
                if (prev) {
                  const arrive = prev.end + est.seconds * 1000 + BUFFER_MS
                  if (arrive > start) start = Math.ceil(arrive / (15 * 60_000)) * (15 * 60_000)
                }
              }
            }
          }

          if (start + durationMs <= gapEnd) {
            options.push({
              startsAt: new Date(start).toISOString(),
              endsAt: new Date(start + durationMs).toISOString(),
              travelMinutes,
              fromLabel,
              nearby: Boolean(nearbyStop),
            })
            if (nearbyStop) personNearby = true
            placed = true
          }
        }
        cursor = Math.max(cursor, Math.min(e.end, close))
      }
    }

    out.push({
      id: person.id,
      name: person.name ?? 'Teammate',
      role: person.role,
      options,
      nearby: personNearby,
    })
  }

  // Dispatch order: someone already in the area first, then whoever can get
  // there soonest. People with no window sink to the bottom, still listed —
  // "no time in the next two weeks" is information.
  out.sort((a, b) => {
    if (a.nearby !== b.nearby) return a.nearby ? -1 : 1
    const at = a.options[0] ? new Date(a.options[0].startsAt).getTime() : Infinity
    const bt = b.options[0] ? new Date(b.options[0].startsAt).getTime() : Infinity
    return at - bt
  })
  return out
}
