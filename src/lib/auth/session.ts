import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'

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
  }>(`select company_id, role, profile, can_edit_catalog from users where id = $1 limit 1`, [user.id])

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
  }>(`select company_id, role, profile, can_edit_catalog from users where id = $1 limit 1`, [user.id])

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
  }
}
