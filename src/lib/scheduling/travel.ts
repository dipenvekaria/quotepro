import { query } from '@/lib/db'

import { type TravelEstimate } from './travel-format'

export { formatTravel, isImpossible, type Leg, type TravelEstimate } from './travel-format'

/**
 * How long it takes to drive from one job to the next.
 *
 * The point is not the number. The point is telling a contractor that the day
 * they just built does not work — a job ending at 2:00 and the next starting at
 * 2:10 forty minutes away is a promise someone is about to break, and it is
 * invisible on a calendar that only draws blocks.
 *
 * Three constraints shape this:
 *
 * **Cost.** Google Routes is roughly $5 per 1,000 requests. One week grid can
 * ask thirty times, and total infrastructure is $111/month. So every answer is
 * cached, and the cache is keyed on rounded coordinates rather than address
 * ids: two customers on the same street share an entry, and a contractor
 * working the same few neighbourhoods hits cache almost always.
 *
 * **Degradation.** No key, no coordinates, or a Google outage must mean "no
 * estimate shown", never a broken calendar. Everything here returns null rather
 * than throwing.
 *
 * **Honesty.** A cached drive time knows nothing about today's traffic. It is
 * labelled as typical, not predicted, because a contractor who is late once
 * because the software sounded certain will not trust the next number either.
 */

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

export type LatLng = { lat: number; lng: number }

/** Rounded to ~11 m. Collapses same-street addresses onto one cache entry. */
export function coordKey(p: LatLng): string {
  return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
}

/**
 * Straight-line kilometres between two points.
 *
 * Used as a guard, not as an answer: if two jobs are 300 m apart there is no
 * point spending a billed request to learn that the drive is short, and if they
 * are 400 km apart the schedule is already impossible whatever the roads do.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Below this, the walk from the van is the journey. Not worth a billed call. */
const TRIVIAL_KM = 0.4
/** Above this, no road answer changes the verdict — the day is already broken. */
const ABSURD_KM = 300


/**
 * Drive time between two points, cache first.
 *
 * Returns null when it cannot say — which the caller must render as silence,
 * not as zero. A zero would read as "no travel needed" and is the one wrong
 * answer that actively misleads.
 */
export async function travelTime(from: LatLng, to: LatLng): Promise<TravelEstimate | null> {
  const km = haversineKm(from, to)
  if (km <= TRIVIAL_KM) return { seconds: 0, meters: Math.round(km * 1000), source: 'estimate' }
  if (km >= ABSURD_KM) {
    // 80 km/h is generous for a service van and deliberately so: the number is
    // only ever used to say "this cannot be done", and understating the drive
    // makes that warning weaker, not stronger.
    return { seconds: Math.round((km / 80) * 3600), meters: Math.round(km * 1000), source: 'estimate' }
  }

  const originKey = coordKey(from)
  const destKey = coordKey(to)

  const [cached] = await query<{ seconds: number; meters: number | null }>(
    'select seconds, meters from travel_estimates where origin_key = $1 and dest_key = $2 limit 1',
    [originKey, destKey],
  )
  if (cached) return { seconds: cached.seconds, meters: cached.meters, source: 'cache' }

  const fresh = await askGoogle(from, to)
  if (!fresh) return null

  // A failed cache write must not lose the answer we already paid for.
  try {
    await query(
      `insert into travel_estimates (origin_key, dest_key, seconds, meters)
       values ($1, $2, $3, $4)
       on conflict (origin_key, dest_key) do nothing`,
      [originKey, destKey, fresh.seconds, fresh.meters],
    )
  } catch (e) {
    console.error('travel estimate not cached', e)
  }

  return fresh
}

async function askGoogle(from: LatLng, to: LatLng): Promise<TravelEstimate | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null

  try {
    const res = await fetch(ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        // Billed by field set. Duration and distance are all this needs — asking
        // for the polyline would move it into a dearer tier for a line nothing
        // draws.
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: 'DRIVE',
        // Deliberately not TRAFFIC_AWARE. This answer is cached and reused for
        // months, so a traffic-adjusted number would be precise about one
        // Tuesday and quietly wrong every day after.
        routingPreference: 'TRAFFIC_UNAWARE',
      }),
    })

    if (!res.ok) {
      console.error('routes lookup failed', res.status, await res.text().catch(() => ''))
      return null
    }

    const data = (await res.json()) as {
      routes?: { duration?: string; distanceMeters?: number }[]
    }
    const route = data.routes?.[0]
    if (!route?.duration) return null

    // Durations come back as a protobuf string: "1234s".
    const seconds = Number(String(route.duration).replace(/s$/, ''))
    if (!Number.isFinite(seconds)) return null

    return { seconds, meters: route.distanceMeters ?? null, source: 'google' }
  } catch (e) {
    console.error('routes lookup threw', e)
    return null
  }
}



