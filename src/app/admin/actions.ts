'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { query } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/admin/guard'

const emailSchema = z.object({ email: z.string().email() })

async function audit(actor: string, action: string, target: string) {
  await query('insert into admin_audit (actor_email, action, target) values ($1, $2, $3)', [
    actor,
    action,
    target,
  ])
}

export async function addPlatformAdmin(input: z.infer<typeof emailSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Enter a valid email.' }

  await query(
    `insert into platform_admins (email, added_by) values (lower($1), $2)
     on conflict (email) do nothing`,
    [parsed.data.email, session.email],
  )
  await audit(session.email, 'admin_granted', parsed.data.email.toLowerCase())
  revalidatePath('/admin')
  return { ok: true as const }
}

export async function removePlatformAdmin(input: z.infer<typeof emailSchema>) {
  const session = await requirePlatformAdmin()
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid email.' }

  // One statement, three guards: the founding (oldest) row is irremovable,
  // and the not-the-last-row check happens inside the same delete so two
  // concurrent removals cannot empty the list.
  const rows = await query<{ email: string }>(
    `delete from platform_admins
      where lower(email) = lower($1)
        and email <> (select email from platform_admins order by created_at asc limit 1)
        and (select count(*) from platform_admins) > 1
      returning email`,
    [parsed.data.email],
  )
  if (!rows.length) {
    return { ok: false as const, error: 'That admin cannot be removed.' }
  }
  await audit(session.email, 'admin_revoked', rows[0].email)
  revalidatePath('/admin')
  return { ok: true as const }
}
