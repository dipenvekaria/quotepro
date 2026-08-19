'use server'

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

/** Company-level; the checklist remains reachable in Settings. */
export async function dismissGettingStarted() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  await query(
    `update companies
        set settings = coalesce(settings, '{}'::jsonb) || '{"getting_started_dismissed": true}'::jsonb
      where id = $1`,
    [session.companyId],
  )
  revalidatePath('/app/dashboard')
  return { ok: true as const }
}
