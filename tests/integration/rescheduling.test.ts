import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'
import { dayKey, moveToDay } from '@/lib/scheduling/day'

import { createCompany, createCustomer, createWorkItem, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * Moving a job on the calendar, against the real table and its constraints.
 *
 * This exists because of a bug the unit tests could not have caught: the update
 * moved `scheduled_start` and left `scheduled_end` where it was, so the new
 * start jumped past the old end and `work_items_schedule_order` rejected the
 * whole statement. Every drag of a job with an end time failed, and the only
 * evidence was a generic "please try again" toast.
 *
 * The date arithmetic is pure and tested in `tests/day.test.ts`. What needs a
 * database is the interaction with the schema.
 */

let co: TestCompany
let customerId: string

/** The statement rescheduleJob runs, kept in step with the action. */
async function reschedule(id: string, when: Date) {
  await query(
    `update work_items
        set scheduled_start = $1,
            scheduled_end = case
              when scheduled_end is null then null
              else scheduled_end + ($1::timestamptz - scheduled_start)
            end
      where id = $2 and company_id = $3`,
    [when.toISOString(), id, co.id],
  )
}

async function read(id: string) {
  const [row] = await query<{ scheduled_start: string; scheduled_end: string | null }>(
    'select scheduled_start, scheduled_end from work_items where id = $1',
    [id],
  )
  return row
}

async function schedule(id: string, start: Date, hours: number | null) {
  await query('update work_items set scheduled_start = $1, scheduled_end = $2 where id = $3', [
    start.toISOString(),
    hours === null ? null : new Date(start.getTime() + hours * 3600_000).toISOString(),
    id,
  ])
}

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Scheduling Co')
  customerId = await createCustomer(co.id, 'Scheduled Customer')
})

afterAll(async () => {
  await co.cleanup()
})

describe('rescheduling a job', () => {
  it('moves a job that has an end time', async () => {
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    // Late evening, four hours long — the shape that used to fail outright.
    const start = new Date(2026, 7, 11, 21, 56)
    await schedule(id, start, 4)

    await reschedule(id, moveToDay(start, '2026-08-13'))

    const after = await read(id)
    expect(dayKey(after.scheduled_start)).toBe('2026-08-13')
  })

  it('keeps the duration, so a four-hour job stays four hours', async () => {
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    const start = new Date(2026, 7, 11, 9, 0)
    await schedule(id, start, 4)

    await reschedule(id, moveToDay(start, '2026-08-20'))

    const after = await read(id)
    const hours =
      (new Date(after.scheduled_end as string).getTime() -
        new Date(after.scheduled_start).getTime()) /
      3600_000
    expect(hours).toBe(4)
  })

  it('keeps the time of day', async () => {
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    const start = new Date(2026, 7, 11, 7, 30)
    await schedule(id, start, 2)

    await reschedule(id, moveToDay(start, '2026-08-14'))

    const moved = new Date((await read(id)).scheduled_start)
    expect(moved.getHours()).toBe(7)
    expect(moved.getMinutes()).toBe(30)
  })

  it('handles a job with no end time', async () => {
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    const start = new Date(2026, 7, 11, 13, 0)
    await schedule(id, start, null)

    await reschedule(id, moveToDay(start, '2026-08-19'))

    const after = await read(id)
    expect(after.scheduled_end).toBeNull()
    expect(dayKey(after.scheduled_start)).toBe('2026-08-19')
  })

  it('moves a job backwards as well as forwards', async () => {
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    const start = new Date(2026, 7, 20, 10, 0)
    await schedule(id, start, 3)

    await reschedule(id, moveToDay(start, '2026-08-10'))

    const after = await read(id)
    expect(dayKey(after.scheduled_start)).toBe('2026-08-10')
    expect(new Date(after.scheduled_end as string) > new Date(after.scheduled_start)).toBe(true)
  })

  it('never leaves a job ending before it starts', async () => {
    // The constraint is the real assertion here — this is what broke.
    const { id } = await createWorkItem(co.id, customerId, 'job_scheduled')
    const start = new Date(2026, 7, 11, 21, 56)
    await schedule(id, start, 6)

    for (const day of ['2026-08-12', '2026-09-01', '2026-08-01', '2027-01-02']) {
      await reschedule(id, moveToDay((await read(id)).scheduled_start, day))
      const after = await read(id)
      expect(dayKey(after.scheduled_start)).toBe(day)
      expect(new Date(after.scheduled_end as string).getTime()).toBeGreaterThanOrEqual(
        new Date(after.scheduled_start).getTime(),
      )
    }
  })

  it('will not move another company\'s job', async () => {
    const other = await createCompany('Not Yours')
    const otherCustomer = await createCustomer(other.id, 'Theirs')
    const { id } = await createWorkItem(other.id, otherCustomer, 'job_scheduled')
    const start = new Date(2026, 7, 11, 9, 0)
    await query('update work_items set scheduled_start = $1 where id = $2', [
      start.toISOString(),
      id,
    ])

    // reschedule() carries co.id, so the company_id predicate must match nothing.
    await reschedule(id, moveToDay(start, '2026-08-25'))

    expect(dayKey((await read(id)).scheduled_start)).toBe('2026-08-11')
    await other.cleanup()
  })
})
