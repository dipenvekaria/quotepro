import { query } from '@/lib/db'

/**
 * In-app notifications — the bell in the top bar.
 *
 * Best-effort by design: a notification is a courtesy about work that already
 * happened, so a failed insert logs loudly and never fails the action that
 * produced it. Recipients are deduplicated and the actor never notifies
 * themselves.
 */
export async function notify(input: {
  companyId: string
  userIds: string[]
  actorId?: string | null
  kind: 'mention' | 'assigned' | 'quote_accepted' | 'quote_viewed' | 'payment'
  title: string
  body?: string | null
  href?: string | null
}): Promise<void> {
  const recipients = [...new Set(input.userIds)].filter((id) => id && id !== input.actorId)
  if (recipients.length === 0) return
  try {
    await query(
      `insert into notifications (company_id, user_id, actor_id, kind, title, body, href)
       select $1, u.id, $3, $4, $5, $6, $7
         from users u
        where u.id = any($2::uuid[]) and u.company_id = $1 and u.is_active`,
      [
        input.companyId,
        recipients,
        input.actorId ?? null,
        input.kind,
        input.title,
        input.body ?? null,
        input.href ?? null,
      ],
    )
  } catch (e) {
    console.error('notify failed', input.kind, e)
  }
}

/** Owner + office users of a company — the default audience for money and quote events. */
export async function officeUserIds(companyId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `select id from users where company_id = $1 and is_active and role in ('owner', 'office')`,
    [companyId],
  )
  return rows.map((r) => r.id)
}
