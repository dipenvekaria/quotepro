import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

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
 * Deleting a company.
 *
 * The delete itself is one statement leaning entirely on thirteen ON DELETE
 * CASCADE constraints, which is exactly why it needs testing against the real
 * schema: if any of those were RESTRICT the delete would fail, and if any were
 * SET NULL the rows would survive as orphans holding a former tenant's data.
 *
 * The bystander company in every test is the point. A deletion that reaches one
 * row too far is the one mistake here with no recovery.
 */

let bystander: TestCompany

beforeAll(async () => {
  await requireDatabase()
  bystander = await createCompany('Bystander Co')
  const customer = await createCustomer(bystander.id, 'Untouched Customer')
  await createWorkItem(bystander.id, customer, 'quote_sent')
  await createCatalogItem(bystander.id, 'Untouched Item', 100)
})

afterAll(async () => {
  await bystander.cleanup()
})

/** A company with one of everything, so cascades have something to bite on. */
async function populated(name: string) {
  const co = await createCompany(name)
  const customer = await createCustomer(co.id, 'Doomed Customer')
  const workItem = await createWorkItem(co.id, customer, 'job_scheduled')
  const catalog = await createCatalogItem(co.id, 'Doomed Item', 250)
  return { co, customer, workItem: workItem.id, catalog }
}

const count = async (table: string, companyId: string) => {
  const [r] = await query<{ n: number }>(
    `select count(*)::int as n from ${table} where company_id = $1`,
    [companyId],
  )
  return r.n
}

describe('deleting a company', () => {
  it('removes the company row', async () => {
    const { co } = await populated('Delete Me')
    await query('delete from companies where id = $1', [co.id])

    const rows = await query('select id from companies where id = $1', [co.id])
    expect(rows).toHaveLength(0)
  })

  it('cascades to customers, work items and the price book', async () => {
    const { co } = await populated('Delete Me Too')
    expect(await count('customers', co.id)).toBe(1)
    expect(await count('work_items', co.id)).toBe(1)
    expect(await count('catalog_items', co.id)).toBe(1)

    await query('delete from companies where id = $1', [co.id])

    expect(await count('customers', co.id)).toBe(0)
    expect(await count('work_items', co.id)).toBe(0)
    expect(await count('catalog_items', co.id)).toBe(0)
  })

  it('cascades to the app user rows', async () => {
    const { co } = await populated('Staffed Co')
    const member = await createUser(`member-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(member.id, co.id, 'technician')
    expect(await count('users', co.id)).toBeGreaterThan(0)

    await query('delete from companies where id = $1', [co.id])

    const rows = await query('select id from users where id = $1', [member.id])
    expect(rows).toHaveLength(0)
  })

  it('leaves the auth login behind, which is why the action deletes it separately', async () => {
    // Documenting the seam rather than asserting a bug: auth.users is outside
    // the cascade, so deleteAccount() calls the admin API for each member. If
    // this ever starts failing, that loop has become redundant.
    const { co } = await populated('Auth Seam Co')
    const member = await createUser(`seam-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(member.id, co.id, 'technician')

    await query('delete from companies where id = $1', [co.id])

    const auth = await query('select id from auth.users where id = $1', [member.id])
    expect(auth).toHaveLength(1)

    await query('delete from auth.users where id = $1', [member.id])
  })

  it('does not touch another company', async () => {
    const { co } = await populated('Noisy Neighbour')
    await query('delete from companies where id = $1', [co.id])

    expect(await count('customers', bystander.id)).toBe(1)
    expect(await count('work_items', bystander.id)).toBe(1)
    expect(await count('catalog_items', bystander.id)).toBe(1)

    const [row] = await query<{ id: string }>('select id from companies where id = $1', [
      bystander.id,
    ])
    expect(row.id).toBe(bystander.id)
  })

  it('leaves no orphan rows pointing at the deleted company', async () => {
    const { co } = await populated('Orphan Check')
    await query('delete from companies where id = $1', [co.id])

    // Every table that carries company_id, asked directly. A SET NULL or a
    // missed constraint would show up here as a surviving row.
    const tables = await query<{ table_name: string }>(
      `select table_name from information_schema.columns
        where column_name = 'company_id' and table_schema = 'public'`,
    )
    expect(tables.length).toBeGreaterThan(5)

    for (const { table_name } of tables) {
      expect({ [table_name]: await count(table_name, co.id) }).toEqual({ [table_name]: 0 })
    }
  })
})

describe('deleting a single user', () => {
  it('does not delete the company', async () => {
    // A technician closing their own login must not take the business with it.
    const { co } = await populated('Survives Co')
    const member = await createUser(`leaver-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(member.id, co.id, 'technician')

    await query('delete from auth.users where id = $1', [member.id])

    const [company] = await query<{ id: string }>('select id from companies where id = $1', [co.id])
    expect(company.id).toBe(co.id)
    expect(await count('customers', co.id)).toBe(1)
    expect(await count('work_items', co.id)).toBe(1)

    await co.cleanup()
  })

  it('keeps work the departing user was assigned, unassigned', async () => {
    // work_items.assigned_to is SET NULL, so the job survives its technician.
    const { co, workItem } = await populated('Reassign Co')
    const member = await createUser(`assigned-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(member.id, co.id, 'technician')
    await query('update work_items set assigned_to = $1 where id = $2', [member.id, workItem])

    await query('delete from auth.users where id = $1', [member.id])

    const [row] = await query<{ id: string; assigned_to: string | null }>(
      'select id, assigned_to from work_items where id = $1',
      [workItem],
    )
    expect(row.id).toBe(workItem)
    expect(row.assigned_to).toBeNull()

    await co.cleanup()
  })
})
