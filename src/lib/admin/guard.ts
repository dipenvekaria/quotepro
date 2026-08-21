import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

/**
 * The /admin surface is platform-scoped: it reads across every tenant, so its
 * gate is an explicit allow-list, not a company role. Non-members get a 404 —
 * the surface should not admit it exists.
 */
export async function requirePlatformAdmin() {
  const session = await requireSession()
  const [row] = await query<{ email: string }>(
    'select email from platform_admins where lower(email) = lower($1) limit 1',
    [session.email],
  )
  if (!row) notFound()
  return session
}
