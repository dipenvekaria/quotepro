import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

/**
 * The /admin surface is platform-scoped: it reads across every tenant, so its
 * gate is an explicit allow-list, not a company role. Non-members get a 404 —
 * the surface should not admit it exists.
 *
 * Membership alone is not enough. The session email must have been issued by
 * Google sign-in and be confirmed: an allow-listed address whose owner has not
 * signed up yet must not be claimable through a raw email/password signup
 * (confirmed by the security review against the local stack).
 */
export async function requirePlatformAdmin() {
  const session = await requireSession()
  const [row] = await query<{ email: string }>(
    `select pa.email
       from platform_admins pa
       join auth.users au on lower(au.email) = pa.email
      where au.id = $1
        and lower(au.email) = lower($2)
        and au.email_confirmed_at is not null
        and au.raw_app_meta_data->>'provider' = 'google'
      limit 1`,
    [session.userId, session.email],
  )
  if (!row) notFound()
  return session
}
