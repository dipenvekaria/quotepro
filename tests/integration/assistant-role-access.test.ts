import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  businessSummary,
  findWork,
  lookupCatalog,
  overdueInvoices,
  todaysSchedule,
  type AssistantContext,
} from '@/lib/ai/assistant-tools'
import { query } from '@/lib/db'
import type { UserRole } from '@/lib/permissions'

import {
  createCatalogItem,
  createCompany,
  createCustomer,
  createUser,
  createWorkItem,
  setMembership,
  type TestCompany,
} from './fixtures'
import { requireDatabase } from './setup'

/**
 * The assistant must not be a way around the role system.
 *
 * A chatbot over a multi-tenant product is a privilege escalation path unless
 * every tool consults the caller's role. "What was our revenue last month?"
 * asked by a technician has to fail for the same reason `/app/analytics` fails
 * for them — and the dashboard shipped exactly that leak once, by reading no
 * role at all.
 *
 * These call the tools directly, with no model involved. The model cannot be
 * part of the defence: it is the thing being defended against.
 */

let co: TestCompany
let owner: { id: string }
let tech: { id: string }
let otherTech: { id: string }

const ctxFor = (userId: string, role: UserRole): AssistantContext => ({
  companyId: co.id,
  userId,
  role,
})

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Assistant Roles Co')

  const uniq = () => crypto.randomUUID().slice(0, 8)
  owner = await createUser(`owner-${uniq()}@test.local`)
  tech = await createUser(`tech-${uniq()}@test.local`)
  otherTech = await createUser(`tech2-${uniq()}@test.local`)
  await setMembership(owner.id, co.id, 'owner')
  await setMembership(tech.id, co.id, 'technician')
  await setMembership(otherTech.id, co.id, 'technician')

  const cust = await createCustomer(co.id, 'Assistant Customer')
  await createCatalogItem(co.id, 'Thermostat — Test', 249)

  const mine = await createWorkItem(co.id, cust, 'job_scheduled', { assignedTo: tech.id, total: 1000 })
  const theirs = await createWorkItem(co.id, cust, 'job_scheduled', {
    assignedTo: otherTech.id,
    total: 2000,
  })
  const noon = new Date(); noon.setHours(12, 0, 0, 0)
  await query('update work_items set scheduled_start = $1 where id = any($2::uuid[])', [
    noon.toISOString(),
    [mine.id, theirs.id],
  ])
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

describe('money is refused, not filtered', () => {
  it.each<UserRole>(['technician', 'sales'])('%s cannot ask for the business summary', async (role) => {
    // Refusal rather than an empty result: a zero would read as "you made no
    // money", which is a different and worse answer than "not your data".
    await expect(businessSummary(ctxFor(tech.id, role))).rejects.toThrow(/do not have access/i)
  })

  it.each<UserRole>(['owner', 'office'])('%s gets it', async (role) => {
    const row = await businessSummary(ctxFor(owner.id, role))
    expect(row).toHaveProperty('open_pipeline')
  })

  it('a technician cannot ask who owes money', async () => {
    await expect(overdueInvoices(ctxFor(tech.id, 'technician'))).rejects.toThrow(/do not have access/i)
  })
})

describe('catalog prices are withheld from the returned object', () => {
  it('an owner sees prices', async () => {
    const res = await lookupCatalog(ctxFor(owner.id, 'owner'), 'thermostat')
    expect(res.prices_visible).toBe(true)
    expect(typeof res.items[0].price).toBe('number')
  })

  it.each<UserRole>(['technician', 'sales'])('%s sees the item but not the price', async (role) => {
    // Not "the model is told not to repeat it" — anything returned to a model
    // can be repeated by it, so the number never reaches the model at all.
    const res = await lookupCatalog(ctxFor(tech.id, role), 'thermostat')
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items[0].name).toBeTruthy()
    expect(res.items[0].price).toBe('hidden')
    expect(res.prices_visible).toBe(false)
  })

  it.each<UserRole>(['technician', 'sales'])(
    '%s is told the price is withheld, not merely left without one',
    async (role) => {
      // Silence invited invention: asked for a price it had not been given, the
      // model made one up — $199 for a $249 item. An absent field reads as a gap
      // to fill. The refusal has to be in the data, not implied by its absence.
      const res = await lookupCatalog(ctxFor(tech.id, role), 'thermostat')
      expect(res.notice).toMatch(/do not state, estimate or guess/i)
    },
  )
})

describe('work is scoped to the person asking', () => {
  it('an owner sees both technicians’ jobs today', async () => {
    expect(await todaysSchedule(ctxFor(owner.id, 'owner'))).toHaveLength(2)
  })

  it('a technician sees only their own', async () => {
    expect(await todaysSchedule(ctxFor(tech.id, 'technician'))).toHaveLength(1)
  })

  it('two technicians do not see each other’s work', async () => {
    const a = (await findWork(ctxFor(tech.id, 'technician'))) as { id: string }[]
    const b = (await findWork(ctxFor(otherTech.id, 'technician'))) as { id: string }[]
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0].id).not.toBe(b[0].id)
  })
})
