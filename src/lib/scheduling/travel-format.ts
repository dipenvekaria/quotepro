/**
 * The parts of travel estimation a browser may import.
 *
 * Split from `travel.ts` because that module reaches Postgres, and the calendar
 * grid is a client component: importing one formatter from it pulled `pg` into
 * the browser bundle and broke `next build`. Typecheck and tests both passed —
 * bundling is neither's job — so this is a class of mistake only the build
 * catches, and the fix is a module boundary rather than vigilance.
 *
 * Nothing here may import anything with a server dependency.
 */

export type TravelEstimate = {
  seconds: number
  meters: number | null
  /** `cache` and `estimate` cost nothing; `google` was a billed request. */
  source: 'cache' | 'google' | 'estimate'
}

export type Leg = {
  /** Minutes between the previous job ending and this one starting. */
  gapMinutes: number
  travel: TravelEstimate
}

/** "25 min", "1h 10m". Minutes, because nobody schedules to the second. */
export function formatTravel(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 1) return 'next door'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/**
 * Whether the gap between two jobs is long enough to make the drive.
 *
 * The whole reason this feature exists. A contractor would rather see the
 * warning while they can still move something.
 */
export function isImpossible({ gapMinutes, travel }: Leg): boolean {
  return gapMinutes < Math.round(travel.seconds / 60)
}
