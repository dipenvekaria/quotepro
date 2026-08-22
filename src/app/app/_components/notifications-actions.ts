'use server'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

export type NotificationRow = {
  id: string
  kind: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

/** The bell's dropdown: the caller's 20 most recent, newest first. */
export async function listNotifications() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const rows = await query<NotificationRow>(
    `select id, kind, title, body, href, read_at, created_at
       from notifications
      where user_id = $1 and company_id = $2
      order by created_at desc
      limit 20`,
    [session.userId, session.companyId],
  )
  return { ok: true as const, data: rows }
}

/** Opening the bell clears the badge — reading the list is reading them. */
export async function markAllNotificationsRead() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  await query(
    `update notifications set read_at = now()
      where user_id = $1 and company_id = $2 and read_at is null`,
    [session.userId, session.companyId],
  )
  return { ok: true as const }
}
