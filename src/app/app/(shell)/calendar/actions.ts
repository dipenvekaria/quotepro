'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { canAssignWork } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'

/**
 * Moving a job on the calendar.
 *
 * A drag is a scheduling decision, so it carries the same authority check as
 * assigning work — a technician dragging their own job to a different day is
 * changing what the business promised a customer.
 */

const rescheduleSchema = z.object({
  id: z.string().uuid(),
  /** ISO. The time of day is preserved by the caller when only the day changed. */
  scheduled_start: z.string().datetime(),
})

export async function rescheduleJob(input: unknown) {
  const parsed = rescheduleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid date' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  if (!canAssignWork(session.role as UserRole)) {
    return { ok: false as const, error: 'Only an owner or the office can move jobs.' }
  }

  const [item] = await query<{ id: string; status: string; scheduled_start: string | null }>(
    `select id, status, scheduled_start from work_items
      where id = $1 and company_id = $2 limit 1`,
    [parsed.data.id, session.companyId],
  )
  if (!item) return { ok: false as const, error: 'Job not found' }

  // A completed job's date is a record of when the work happened, not a plan.
  if (item.status === 'job_completed' || item.status === 'archived') {
    return { ok: false as const, error: 'That job is finished — its date is history now.' }
  }

  // An estimate visit lives in its own date columns; dragging one moves those,
  // not the job's.
  const isEstimate = item.status === 'estimate_scheduled'
  try {
    if (isEstimate) {
      await query(
        `update work_items
            set estimate_scheduled_start = $1,
                estimate_scheduled_end = case
                  when estimate_scheduled_end is null then null
                  else estimate_scheduled_end + ($1::timestamptz - estimate_scheduled_start)
                end
          where id = $2 and company_id = $3`,
        [parsed.data.scheduled_start, parsed.data.id, session.companyId],
      )
    } else {
      // Shift the end by the same interval rather than only moving the start.
      // A four-hour job dragged to Thursday is still four hours, and moving the
      // start alone pushes it past scheduled_end — which trips the
      // work_items_schedule_order check and fails the whole drag.
      await query(
        `update work_items
            set scheduled_start = $1,
                scheduled_end = case
                  when scheduled_end is null then null
                  else scheduled_end + ($1::timestamptz - scheduled_start)
                end
          where id = $2 and company_id = $3`,
        [parsed.data.scheduled_start, parsed.data.id, session.companyId],
      )
    }
  } catch (e) {
    console.error('rescheduleJob failed', e)
    return { ok: false as const, error: 'Could not move that job. Please try again.' }
  }

  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  revalidatePath(`/app/pipeline/${parsed.data.id}`)
  return { ok: true as const, data: { id: parsed.data.id, previous: item.scheduled_start } }
}
