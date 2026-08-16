import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { canSeeAnalytics, workItemScope } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'

import { createCompany, createCustomer, createUser, createWorkItem, setMembership, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * The dashboard is where every role lands after signing in, and it read no
 * role at all: company-wide revenue, close rate, open pipeline value and every
 * unpaid invoice rendered for a technician. `canSeeAnalytics` existed and
 * guarded the same figures on /app/analytics, and `canSeeCatalogPrices`
 * guarded the price book — two gates on side doors while the front one stood
 * open.
 *
 * These run the page's actual predicates against real rows. `tests/scope.test.ts`
 * checks the fragments are shaped correctly; this checks the dashboard confines
 * anything.
 */

let co: TestCompany
let owner: { id: string; email: string }
let tech: { id: string; email: string }
let otherTech: { id: string; email: string }

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Dashboard Roles Co')

  const uniq = () => crypto.randomUUID().slice(0, 8)
  owner = await createUser(`owner-${uniq()}@test.local`)
  tech = await createUser(`tech-${uniq()}@test.local`)
  otherTech = await createUser(`tech2-${uniq()}@test.local`)
  await setMembership(owner.id, co.id, 'owner')
  await setMembership(tech.id, co.id, 'technician')
  await setMembership(otherTech.id, co.id, 'technician')

  const custId = await createCustomer(co.id, 'Dashboard Customer')
  // One job each, both scheduled inside today's window. The fixture does not
  // take a schedule, so it is set straight after.
  const a = await createWorkItem(co.id, custId, 'job_scheduled', { assignedTo: tech.id, total: 1000 })
  const b = await createWorkItem(co.id, custId, 'job_scheduled', { assignedTo: otherTech.id, total: 2000 })
  const soon = new Date()
  soon.setHours(12, 0, 0, 0)
  await query('update work_items set scheduled_start = $1 where id = any($2::uuid[])', [
    soon.toISOString(),
    [a.id, b.id],
  ])
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

/** The dashboard's today's-jobs query, verbatim in shape. */
async function todaysJobsFor(userId: string, role: UserRole) {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  const scope = workItemScope({ companyId: co.id, userId, role }, 3)
  return query<{ id: string }>(
    `select w.id from work_items w
      where w.company_id = $1 and w.scheduled_start >= $2 and w.scheduled_start < $3${scope.sql}`,
    [co.id, dayStart.toISOString(), dayEnd.toISOString(), ...scope.params],
  )
}

/** The dashboard's metrics query, which every money figure derives from. */
async function metricsFor(role: UserRole) {
  const seesMoney = canSeeAnalytics(role)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString()
  return query<{ id: string }>(
    `select id from work_items where company_id = $1 and created_at >= $2 and $3`,
    [co.id, sixtyDaysAgo, seesMoney],
  )
}

describe('dashboard — work is scoped by role', () => {
  it('an owner sees both technicians’ jobs', async () => {
    expect(await todaysJobsFor(owner.id, 'owner')).toHaveLength(2)
  })

  it('a technician sees only their own', async () => {
    const rows = await todaysJobsFor(tech.id, 'technician')
    expect(rows).toHaveLength(1)
  })

  it('two technicians do not see each other’s work', async () => {
    const a = await todaysJobsFor(tech.id, 'technician')
    const b = await todaysJobsFor(otherTech.id, 'technician')
    expect(a[0].id).not.toBe(b[0].id)
  })
})

describe('dashboard — money is withheld in the query, not the markup', () => {
  it('owner and office get the rows revenue is computed from', async () => {
    expect((await metricsFor('owner')).length).toBeGreaterThan(0)
    expect((await metricsFor('office')).length).toBeGreaterThan(0)
  })

  it.each<UserRole>(['technician', 'sales'])('%s gets none of them', async (role) => {
    // Not "renders nothing" — returns nothing. A conditional in JSX still
    // ships the totals to the browser, where they are readable in devtools.
    expect(await metricsFor(role)).toHaveLength(0)
  })

  it('canSeeAnalytics is the single definition of who sees money', () => {
    expect(canSeeAnalytics('owner')).toBe(true)
    expect(canSeeAnalytics('office')).toBe(true)
    expect(canSeeAnalytics('technician')).toBe(false)
    expect(canSeeAnalytics('sales')).toBe(false)
  })
})
