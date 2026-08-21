import { query } from '@/lib/db'

/**
 * A fixed-window rate limiter, in Postgres.
 *
 * The public token routes are unauthenticated by design — the 128-bit token is
 * the credential — so anyone holding a quote or invoice link could call them as
 * fast as they liked. And the AI actions cost real money per call, which makes
 * them the obvious way to run up a bill. Both are metered here.
 *
 * The whole check is one statement. `on conflict` makes it atomic, so two
 * concurrent requests cannot both read a stale count and both decide they are
 * under the limit — which is the bug most hand-written limiters have and only
 * discover under exactly the load they exist to survive.
 */

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets. For a Retry-After header. */
  resetIn: number
}

/**
 * Count one hit against `bucket`.
 *
 * `bucket` should encode both what is limited and for whom — `sign:<token>`,
 * `ai:<companyId>` — so that one contractor's usage cannot exhaust another's.
 * A global bucket would turn a rate limit into a denial of service that any
 * single tenant could trigger for everyone.
 *
 * Fails **open**. If the limiter itself is broken, quoting should keep working:
 * refusing every request because a counter would not increment converts a
 * minor outage into a total one.
 */
export async function checkRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const [row] = await query<{ hits: number; age_seconds: number }>(
      `insert into rate_limits (bucket, window_start, hits)
       values ($1, now(), 1)
       on conflict (bucket) do update
         set hits = case
                      when rate_limits.window_start < now() - make_interval(secs => $2)
                      then 1
                      else rate_limits.hits + 1
                    end,
             window_start = case
                              when rate_limits.window_start < now() - make_interval(secs => $2)
                              then now()
                              else rate_limits.window_start
                            end
       returning hits, extract(epoch from (now() - window_start))::int as age_seconds`,
      [bucket, windowSeconds],
    )

    const hits = row?.hits ?? 1
    return {
      allowed: hits <= limit,
      remaining: Math.max(0, limit - hits),
      resetIn: Math.max(0, windowSeconds - (row?.age_seconds ?? 0)),
    }
  } catch (e) {
    console.error('rate limiter unavailable, allowing', e)
    return { allowed: true, remaining: limit, resetIn: 0 }
  }
}

/**
 * Sensible ceilings, in one place so they can be argued about.
 *
 * Each is set well above what a person doing the thing legitimately would ever
 * reach, and well below what makes abuse worthwhile. A limit tight enough to
 * catch a real user is a limit that will be removed.
 */
export const LIMITS = {
  /** Accepting or declining from the public viewer. */
  quoteAction: { limit: 20, windowSeconds: 600 },
  /** AI drafting, per company. Costs money per call. */
  aiGenerate: { limit: 60, windowSeconds: 3600 },
  /** Reading a price book out of a document — far dearer per call. */
  aiExtract: { limit: 15, windowSeconds: 3600 },
  /** Public checkout-session creation, per invoice token. */
  checkout: { limit: 30, windowSeconds: 600 },
  /** Public waitlist signups, per IP. */
  waitlist: { limit: 5, windowSeconds: 3600 },
  /** Bolt assistant turns, per company. Gemini plus a tool loop. */
  bolt: { limit: 60, windowSeconds: 3600 },
  /** Support messages, per company. */
  support: { limit: 10, windowSeconds: 3600 },
} as const

/** Best-effort client IP for unauthenticated buckets. */
export function clientIp(h: Headers): string {
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

/** Convenience for actions: the standard refusal payload. */
export function rateLimited() {
  return { ok: false as const, error: 'Too many attempts. Please wait a minute and try again.' }
}

/** Prunes closed windows. Safe to call from anything; nothing reads them. */
export async function pruneRateLimits(): Promise<void> {
  try {
    await query("delete from rate_limits where window_start < now() - interval '1 day'")
  } catch {
    // Housekeeping. A failure here is not worth a log line on every request.
  }
}
