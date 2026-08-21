'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { query } from '@/lib/db'
import { requirePlatformAdmin } from '@/lib/admin/guard'

const emailSchema = z.object({ email: z.string().email() })

export async function addPlatformAdmin(input: z.infer<typeof emailSchema>) {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Enter a valid email.' }
  const session = await requirePlatformAdmin()

  await query(
    `insert into platform_admins (email, added_by) values (lower($1), $2)
     on conflict (email) do nothing`,
    [parsed.data.email, session.email],
  )
  revalidatePath('/admin')
  return { ok: true as const }
}

export async function removePlatformAdmin(input: z.infer<typeof emailSchema>) {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid email.' }
  await requirePlatformAdmin()

  // Never remove the last key to the room.
  const [{ count }] = await query<{ count: string }>('select count(*) from platform_admins')
  if (Number(count) <= 1) return { ok: false as const, error: 'Cannot remove the last admin.' }

  await query('delete from platform_admins where lower(email) = lower($1)', [parsed.data.email])
  revalidatePath('/admin')
  return { ok: true as const }
}
