'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

const passCardFeesSchema = z.object({ pass_card_fees: z.boolean() })

/**
 * The checkbox on the Stripe card. The old UI POSTed to an API route that
 * was never written — a dead control toasting "Could not save preference."
 */
export async function setPassCardFees(input: z.infer<typeof passCardFeesSchema>) {
  const parsed = passCardFeesSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins can change payment settings.' }
  }

  await query('update companies set pass_card_fees = $1 where id = $2', [
    parsed.data.pass_card_fees,
    session.companyId,
  ])
  revalidatePath('/app/integrations')
  return { ok: true as const }
}
