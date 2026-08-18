import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'
import { companyTz } from '@/lib/time'

export type SessionContext = {
  userId: string
  email: string
  companyId: string
  role: string
  profile: Record<string, unknown> | null
  /**
   * Owner-granted permission to edit the price book. Always false for roles
   * that were never granted it; irrelevant for owners, who can regardless.
   * Read here so no caller has to remember a second query to find out.
   */
  canEditCatalog: boolean
  /** The company's IANA timezone, validated — every day boundary reads this. */
  timezone: string
}

// Auth stays on Supabase (getUser); the user/company row is read via raw pg.
// Returns null when there's no session or no company (for server actions that
// return error results instead of redirecting).
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const rows = await query<{
    company_id: string | null
    role: string | null
    profile: Record<string, unknown> | null
    can_edit_catalog: boolean | null
    tz: string | null
  }>(
    // The timezone rides along with the row every page already reads — the
    // dashboard and calendar each paid an extra round trip for it before.
    `select u.company_id, u.role, u.profile, u.can_edit_catalog,
            c.settings->>'timezone' as tz
       from users u
       join companies c on c.id = u.company_id
      where u.id = $1 limit 1`,
    [user.id],
  )

  const row = rows[0]
  if (!row?.company_id) return null

  return {
    userId: user.id,
    email: user.email ?? '',
    companyId: row.company_id,
    // 'technician' is the most restricted role and what getPermissions()
    // falls back to anyway. The previous default, 'member', is not a
    // member of the user_role enum at all.
    role: row.role ?? 'technician',
    profile: row.profile,
    canEditCatalog: row.can_edit_catalog === true,
    timezone: companyTz({ timezone: row.tz }),
  }
}

// Auth stays on Supabase (getUser); the user/company row is read via raw pg.
// Redirects to /login or /app/onboarding when there's no session/company.
export async function requireSession(): Promise<SessionContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rows = await query<{
    company_id: string | null
    role: string | null
    profile: Record<string, unknown> | null
    can_edit_catalog: boolean | null
    tz: string | null
  }>(
    // The timezone rides along with the row every page already reads — the
    // dashboard and calendar each paid an extra round trip for it before.
    `select u.company_id, u.role, u.profile, u.can_edit_catalog,
            c.settings->>'timezone' as tz
       from users u
       join companies c on c.id = u.company_id
      where u.id = $1 limit 1`,
    [user.id],
  )

  const row = rows[0]
  if (!row?.company_id) redirect('/app/onboarding')

  return {
    userId: user.id,
    email: user.email ?? '',
    companyId: row.company_id,
    // 'technician' is the most restricted role and what getPermissions()
    // falls back to anyway. The previous default, 'member', is not a
    // member of the user_role enum at all.
    role: row.role ?? 'technician',
    profile: row.profile,
    canEditCatalog: row.can_edit_catalog === true,
    timezone: companyTz({ timezone: row.tz }),
  }
}
