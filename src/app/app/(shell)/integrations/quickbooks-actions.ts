'use server'

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

export async function disconnectQuickbooks() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner') {
    return { ok: false as const, error: 'Only owners and admins manage integrations' }
  }
  // The synced ids stay on invoices/customers — history in QBO is theirs to
  // keep; disconnecting only stops new pushes.
  await query(`delete from quickbooks_connections where company_id = $1`, [session.companyId])
  revalidatePath('/app/integrations')
  return { ok: true as const }
}
