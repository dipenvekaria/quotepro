/**
 * Database access for scheduling. The maths lives in ./slots.ts, which has no
 * imports so it can be tested without a database.
 */

import { query } from '@/lib/db'

import { DEFAULT_HOURS, NOMINAL_JOB_HOURS, type BusinessHours, type Booking, type DayKey } from './slots'

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export * from './slots'

export async function loadBusinessHours(companyId: string): Promise<BusinessHours> {
  const rows = await query<{ business_hours: unknown }>(
    `select business_hours from companies where id = $1`,
    [companyId],
  )
  const raw = rows[0]?.business_hours
  if (!raw || typeof raw !== 'object') return DEFAULT_HOURS

  // Trust the shape loosely — a hand-edited settings row should degrade to the
  // default for that day rather than throw on the scheduling screen.
  const out = { ...DEFAULT_HOURS }
  for (const key of DAY_KEYS) {
    const v = (raw as Record<string, unknown>)[key]
    if (v === null) out[key] = null
    else if (
      v &&
      typeof v === 'object' &&
      typeof (v as { start?: unknown }).start === 'string' &&
      typeof (v as { end?: unknown }).end === 'string'
    ) {
      out[key] = { start: (v as { start: string }).start, end: (v as { end: string }).end }
    }
  }
  return out
}

/** Everything already booked in the window, with real durations. */
export async function loadBookings(companyId: string, from: Date, to: Date): Promise<Booking[]> {
  const rows = await query<{
    id: string
    job_name: string | null
    description: string | null
    customer_name: string | null
    assigned_to: string | null
    scheduled_start: string
    estimated_hours: number | null
  }>(
    `select w.id, w.job_name, w.description, w.assigned_to, w.scheduled_start,
            w.estimated_hours, c.name as customer_name
       from work_items w
       left join customers c on c.id = w.customer_id
      where w.company_id = $1
        and w.scheduled_start is not null
        and w.scheduled_start >= $2
        and w.scheduled_start < $3
        and w.status not in ('job_cancelled', 'archived')
      order by w.scheduled_start`,
    [companyId, from.toISOString(), to.toISOString()],
  )

  return rows.map((r) => {
    const start = new Date(r.scheduled_start)
    const hours = r.estimated_hours === null ? null : Number(r.estimated_hours)
    return {
      id: r.id,
      title: r.job_name || r.description || 'Job',
      customerName: r.customer_name,
      assignedTo: r.assigned_to,
      start,
      end: new Date(start.getTime() + (hours ?? NOMINAL_JOB_HOURS) * 3600_000),
      estimatedHours: hours,
    }
  })
}

