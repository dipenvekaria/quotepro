import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { customerScope, workItemScope, type Scope } from '@/lib/auth/scope'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'

import {
  createCompany,
  createCustomer,
  createUser,
  createWorkItem,
  setMembership,
  type TestCompany,
} from './fixtures'
import { requireDatabase } from './setup'

/**
 * Role scoping, run as SQL against real rows.
 *
 * `tests/scope.test.ts` checks the fragments are shaped correctly. These check
 * they actually confine anything — a fragment can be perfectly formed and still
 * select the wrong set.
 *
 * Until this existed every page read company-wide, so a technician could see
 * every job, customer and price in the business.
 */

let co: TestCompany
let tech: { id: string; email: string }
let otherTech: { id: string; email: string }
let sales: { id: string; email: string }

const ids: Record<string, string> = {}

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Scoping Co')

  tech = await createUser(`tech-${crypto.randomUUID().slice(0, 8)}@test.local`)
  otherTech = await createUser(`tech2-${crypto.randomUUID().slice(0, 8)}@test.local`)
  sales = await createUser(`sales-${crypto.randomUUID().slice(0, 8)}@test.local`)
  await setMembership(tech.id, co.id, 'technician')
  await setMembership(otherTech.id, co.id, 'technician')
  await setMembership(sales.id, co.id, 'sales')

  ids.custMine = await createCustomer(co.id, 'Mine', '+1-555-0001')
  ids.custTheirs = await createCustomer(co.id, 'Theirs', '+1-555-0002')

  ids.jobMine = (await createWorkItem(co.id, ids.custMine, 'job_scheduled', { assignedTo: tech.id })).id
  ids.jobTheirs = (await createWorkItem(co.id, ids.custTheirs, 'job_scheduled', { assignedTo: otherTech.id })).id
  ids.jobUnassigned = (await createWorkItem(co.id, ids.custTheirs, 'quote_sent')).id

  // A quote sales created but was never assigned.
  const salesQuote = await createWorkItem(co.id, ids.custTheirs, 'quote_sent')
  await query('update work_items set created_by = $1 where id = $2', [sales.id, salesQuote.id])
  ids.jobSalesMade = salesQuote.id
})

afterAll(async () => {
  await co.cleanup()
})

const scopeFor = (userId: string, role: UserRole): Scope => ({
  companyId: co.id,
  userId,
  role,
})

/** Runs the work-item list exactly as a page would, for one role. */
async function visibleWorkItems(userId: string, role: UserRole) {
  const s = workItemScope(scopeFor(userId, role), 1)
  const rows = await query<{ id: string }>(
    `select w.id from work_items w where w.company_id = $1${s.sql}`,
    [co.id, ...s.params],
  )
  return rows.map((r) => r.id)
}

async function visibleCustomers(userId: string, role: UserRole) {
  const s = customerScope(scopeFor(userId, role), 1, 'c')
  const rows = await query<{ id: string }>(
    `select c.id from customers c where c.company_id = $1${s.sql}`,
    [co.id, ...s.params],
  )
  return rows.map((r) => r.id)
}

describe('technicians', () => {
  it('see the jobs assigned to them', async () => {
    expect(await visibleWorkItems(tech.id, 'technician')).toContain(ids.jobMine)
  })

  it("do not see another technician's job", async () => {
    expect(await visibleWorkItems(tech.id, 'technician')).not.toContain(ids.jobTheirs)
  })

  it('do not see unassigned work, which is the pipeline', async () => {
    expect(await visibleWorkItems(tech.id, 'technician')).not.toContain(ids.jobUnassigned)
  })

  it('see exactly one job here, not the four that exist', async () => {
    const all = await query<{ n: number }>(
      'select count(*)::int as n from work_items where company_id = $1',
      [co.id],
    )
    expect(all[0].n).toBe(4)
    expect(await visibleWorkItems(tech.id, 'technician')).toHaveLength(1)
  })

  it('see customers on their assigned work', async () => {
    expect(await visibleCustomers(tech.id, 'technician')).toContain(ids.custMine)
  })

  it("do not see a customer they have no work for", async () => {
    expect(await visibleCustomers(tech.id, 'technician')).not.toContain(ids.custTheirs)
  })

  it('cannot reach an unassigned job by its id', async () => {
    // The detail page applies the same scope, so a guessed URL 404s.
    const s = workItemScope(scopeFor(tech.id, 'technician'), 2)
    const rows = await query(
      `select w.id from work_items w where w.company_id = $1 and w.id = $2${s.sql}`,
      [co.id, ids.jobTheirs, ...s.params],
    )
    expect(rows).toHaveLength(0)
  })
})

describe('sales', () => {
  it('see quotes they created', async () => {
    expect(await visibleWorkItems(sales.id, 'sales')).toContain(ids.jobSalesMade)
  })

  it("do not see a technician's job they had no part in", async () => {
    expect(await visibleWorkItems(sales.id, 'sales')).not.toContain(ids.jobMine)
  })
})

describe('owner and office', () => {
  it('see everything in the company', async () => {
    const owner = await visibleWorkItems(co.owner.id, 'owner')
    expect(owner).toHaveLength(4)
    expect(owner).toContain(ids.jobMine)
    expect(owner).toContain(ids.jobTheirs)
  })

  it('office sees everything too', async () => {
    expect(await visibleWorkItems(co.owner.id, 'office')).toHaveLength(4)
  })
})

describe('scoping never widens beyond the company', () => {
  it('an owner of one company still sees nothing of another', async () => {
    const other = await createCompany('Elsewhere')
    const otherCust = await createCustomer(other.id, 'Not Yours')
    const otherJob = await createWorkItem(other.id, otherCust, 'quote_sent')

    // Owner scope adds no restriction, so company_id is doing all the work here
    // — which is exactly the case worth proving.
    expect(await visibleWorkItems(co.owner.id, 'owner')).not.toContain(otherJob.id)

    await other.cleanup()
  })

  it('an unrecognised role sees nothing at all', async () => {
    expect(await visibleWorkItems(tech.id, 'nonsense' as UserRole)).toHaveLength(0)
  })
})
