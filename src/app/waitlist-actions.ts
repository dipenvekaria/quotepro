'use server'

import { z } from 'zod'

import { query } from '@/lib/db'
import { headers } from 'next/headers'
import { LIMITS, checkRateLimit, clientIp, rateLimited } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().max(40).optional(),
})

/**
 * Interest capture while signups are invite-only. Public and unauthenticated
 * by design; idempotent on the email so refresh-and-resubmit stays quiet.
 */
export async function joinWaitlist(input: { email: string; source?: string }) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Enter a valid email address.' }
  const ip = clientIp(await headers())
  const rl = await checkRateLimit(`waitlist:${ip}`, LIMITS.waitlist.limit, LIMITS.waitlist.windowSeconds)
  if (!rl.allowed) return rateLimited()

  try {
    await query(
      `insert into waitlist (email, source) values ($1, $2)
       on conflict (email) do nothing`,
      [parsed.data.email, parsed.data.source ?? 'homepage'],
    )
  } catch (e) {
    console.error('waitlist insert failed', e)
    return { ok: false as const, error: 'Something went wrong — try again.' }
  }
  return { ok: true as const }
}
