import { dayKey } from '@/lib/scheduling/day'
import { isImpossible, travelTime, type LatLng, type TravelEstimate } from '@/lib/scheduling/travel'

/**
 * The drive between one job and the next, for the same person on the same day.
 *
 * Legs are computed per assignee per day and never across people: two
 * technicians at opposite ends of the county are not a scheduling problem, and
 * pairing their jobs would invent one.
 */

export type SchedulableJob = {
  id: string
  scheduled_start: string
  estimated_hours: number | null
  assigned_to: string | null
  lat: number | null
  lng: number | null
}

export type JobLeg = {
  /** The job this drive arrives at. */
  toJobId: string
  fromJobId: string
  travel: TravelEstimate
  gapMinutes: number
  impossible: boolean
}

/** Jobs with no duration still occupy time; an hour is the least dishonest guess. */
const DEFAULT_HOURS = 1

function endOf(job: SchedulableJob): number {
  const hours = job.estimated_hours && job.estimated_hours > 0 ? job.estimated_hours : DEFAULT_HOURS
  return new Date(job.scheduled_start).getTime() + hours * 3_600_000
}

function hasCoords(j: SchedulableJob): j is SchedulableJob & LatLng {
  return typeof j.lat === 'number' && typeof j.lng === 'number'
}

/**
 * Consecutive pairs, grouped by person and day.
 *
 * Unassigned jobs are skipped entirely rather than pooled together: "nobody" is
 * not a person who has to drive anywhere, and treating the unassigned pile as
 * one route would produce warnings about a journey no one is making.
 */
export function consecutivePairs(jobs: SchedulableJob[]): [SchedulableJob, SchedulableJob][] {
  const byPersonDay = new Map<string, SchedulableJob[]>()

  for (const j of jobs) {
    if (!j.assigned_to) continue
    const key = `${j.assigned_to}|${dayKey(j.scheduled_start)}`
    const list = byPersonDay.get(key)
    if (list) list.push(j)
    else byPersonDay.set(key, [j])
  }

  const pairs: [SchedulableJob, SchedulableJob][] = []
  for (const list of byPersonDay.values()) {
    list.sort(
      (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime(),
    )
    for (let i = 1; i < list.length; i++) pairs.push([list[i - 1], list[i]])
  }
  return pairs
}

/**
 * Drive times for every consecutive pair on the board.
 *
 * Pairs without coordinates on both ends are dropped silently — an address
 * entered before geocoding existed, or typed by hand, simply gets no estimate.
 * Showing nothing is right; showing zero would read as "no travel needed", which
 * is the one wrong answer that actively misleads.
 *
 * Lookups run in parallel and every one is cache-first, so a normal week costs
 * nothing after the first load.
 */
export async function computeLegs(jobs: SchedulableJob[]): Promise<Record<string, JobLeg>> {
  const pairs = consecutivePairs(jobs).filter(([a, b]) => hasCoords(a) && hasCoords(b))
  if (pairs.length === 0) return {}

  const results = await Promise.all(
    pairs.map(async ([from, to]) => {
      if (!hasCoords(from) || !hasCoords(to)) return null
      const travel = await travelTime(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
      )
      if (!travel) return null

      const gapMinutes = Math.round(
        (new Date(to.scheduled_start).getTime() - endOf(from)) / 60_000,
      )
      const leg: JobLeg = {
        fromJobId: from.id,
        toJobId: to.id,
        travel,
        gapMinutes,
        impossible: isImpossible({ gapMinutes, travel }),
      }
      return leg
    }),
  )

  const out: Record<string, JobLeg> = {}
  for (const leg of results) if (leg) out[leg.toJobId] = leg
  return out
}
