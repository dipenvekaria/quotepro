'use server'

import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { withUser } from '@/lib/db'
import { readOnlyGuard } from '@/lib/billing/access'
import { logActivity } from '@/lib/activity'

const leadSchema = z.object({
  customer_name: z.string().trim().min(1, 'Who called?').max(200),
  customer_phone: z.string().trim().max(40).optional(),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(),
  description: z.string().trim().max(2000).optional(),
})

/**
 * Light lead capture — the phone rings, jot it down, done. Same record as a
 * quote (one work item carries the lifecycle); only the entry point is
 * lighter. Drafting the quote comes later, on the lead's own page.
 */
export async function createLead(input: unknown) {
  const parsed = leadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const readOnly = await readOnlyGuard(session.companyId)
  if (readOnly) return readOnly
  const { companyId, userId } = session

  let id: string | undefined
  try {
    id = await withUser(userId, async (q) => {
      const rows = await q<{ id: string }>(
        `select create_work_item_with_customer(
           p_company_id => $1,
           p_customer_name => $2,
           p_customer_phone => $3,
           p_customer_email => $4,
           p_address => $5,
           p_description => $6,
           p_status => $7::work_item_status
         ) as id`,
        [
          companyId,
          parsed.data.customer_name,
          parsed.data.customer_phone || null,
          parsed.data.customer_email || null,
          parsed.data.address || null,
          parsed.data.description || null,
          'lead',
        ],
      )
      return rows[0]?.id
    })
  } catch (e) {
    console.error('createLead failed', e)
    return { ok: false as const, error: 'Could not save the lead. Please try again.' }
  }
  if (!id) return { ok: false as const, error: 'Could not save the lead. Please try again.' }

  await logActivity({
    companyId,
    userId,
    entityId: String(id),
    action: 'lead_created',
    description: `Lead captured — ${parsed.data.customer_name}`,
  })

  return { ok: true as const, data: { id } }
}
