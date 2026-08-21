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
 * Closing an account.
 *
 * `archive_and_delete_company()` snapshots a whole tenant into JSONB and then
 * deletes it, which puts two things at risk that only a real database can test:
 * that the snapshot is complete, and that it stops at the tenant boundary. A
 * snapshot missing a table looks exactly like success and loses the data
 * silently, months before anyone asks for a restore.
 */

let bystander: TestCompany

/**
 * Tables that hold no company data and are correctly absent from a snapshot.
 * Anything not listed here and not archived fails the completeness test, so a
 * new table has to be considered rather than forgotten.
 */
const NOT_COMPANY_DATA = new Set([
  'platform_admins', // platform-level allow-list, no tenant rows
  'admin_audit', // platform-level audit ledger, no tenant rows
  'companies', // the snapshot's own root, stored as `company`
  'archived_accounts', // archives of other tenants
  'webhooks_inbound', // raw provider payloads, not tenant-owned
  'adk_sessions_v2', // dead ADK backend
  // Cached drive times between rounded coordinate pairs. Shared across
  // companies on purpose — a distance belongs to nobody — so there is nothing
  // here to archive with a tenant, and nothing lost when one closes.
  'travel_estimates',
  // Rate-limit counters. A bucket string and a number, with nothing to restore
  // and nothing worth keeping when a company closes.
  'rate_limits',
  // Pre-customer interest capture from the homepage — no tenant owns it.
  'waitlist',
])

beforeAll(async () => {
  await requireDatabase()
  bystander = await createCompany('Bystander Co')
  const customer = await createCustomer(bystander.id, 'Untouched Customer')
  await createWorkItem(bystander.id, customer, 'quote_sent')
  await createCatalogItem(bystander.id, 'Untouched Item', 100)
})

afterAll(async () => {
  await bystander.cleanup()
  await query('delete from archived_accounts where company_name like $1', ['Archive Test%'])
})

/** A company with one of everything, so the snapshot has something to catch. */
async function populated(name: string) {
  const co = await createCompany(name)
  const customer = await createCustomer(co.id, 'Doomed Customer')
  const workItem = await createWorkItem(co.id, customer, 'job_scheduled')
  const catalog = await createCatalogItem(co.id, 'Doomed Item', 250)
  return { co, customer, workItem: workItem.id, catalog }
}

async function archive(companyId: string, actor?: string) {
  const [row] = await query<{ archive_and_delete_company: string }>(
    'select archive_and_delete_company($1, $2, $3)',
    [companyId, actor ?? null, actor ? 'actor@test.local' : null],
  )
  return row.archive_and_delete_company
}

async function readArchive(id: string) {
  const [row] = await query<{
    company_name: string
    company_id: string
    stats: Record<string, number>
    snapshot: Record<string, unknown>
    archived_by_email: string | null
  }>(
    `select company_name, company_id, stats, snapshot, archived_by_email
       from archived_accounts where id = $1`,
    [id],
  )
  return row
}

const count = async (table: string, companyId: string) => {
  const [r] = await query<{ n: number }>(
    `select count(*)::int as n from ${table} where company_id = $1`,
    [companyId],
  )
  return r.n
}

describe('archiving a company', () => {
  it('removes it from the live tables', async () => {
    const { co } = await populated('Archive Test One')
    await archive(co.id)

    expect(await query('select id from companies where id = $1', [co.id])).toHaveLength(0)
    expect(await count('customers', co.id)).toBe(0)
    expect(await count('work_items', co.id)).toBe(0)
    expect(await count('catalog_items', co.id)).toBe(0)
  })

  it('keeps the rows in the snapshot', async () => {
    const { co, customer } = await populated('Archive Test Two')
    const row = await readArchive(await archive(co.id))

    expect(row.company_name).toBe('Archive Test Two')
    expect(row.company_id).toBe(co.id)
    const customers = row.snapshot.customers as Array<{ id: string; name: string }>
    expect(customers).toHaveLength(1)
    expect(customers[0].id).toBe(customer)
    expect(customers[0].name).toBe('Doomed Customer')
  })

  it('keeps the company row itself', async () => {
    const { co } = await populated('Archive Test Three')
    const row = await readArchive(await archive(co.id))
    expect((row.snapshot.company as { name: string }).name).toBe('Archive Test Three')
  })

  it('records who closed it', async () => {
    const { co } = await populated('Archive Test Four')
    const actor = await createUser(`actor-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(actor.id, co.id, 'owner')

    const row = await readArchive(await archive(co.id, actor.id))
    expect(row.archived_by_email).toBe('actor@test.local')
  })

  it('does not expire, so nothing ages out of the record', async () => {
    // Archives are permanent by decision. A purge_after column here would mean
    // someone had reintroduced a retention window without saying so.
    const { co } = await populated('Archive Test Five')
    await archive(co.id)

    const cols = await query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_name = 'archived_accounts' and table_schema = 'public'`,
    )
    expect(cols.map((c) => c.column_name)).not.toContain('purge_after')
  })

  it('can still be erased on request, which is one statement', async () => {
    // Retention is indefinite, not mandatory. GDPR Art. 17 needs this to work.
    const { co } = await populated('Archive Test Erasure')
    const id = await archive(co.id)
    expect(await readArchive(id)).toBeTruthy()

    await query('delete from archived_accounts where id = $1', [id])
    expect(await readArchive(id)).toBeUndefined()
  })

  it('counts what it stored', async () => {
    const { co } = await populated('Archive Test Six')
    const row = await readArchive(await archive(co.id))

    expect(row.stats.customers).toBe(1)
    expect(row.stats.work_items).toBe(1)
    expect(row.stats.catalog_items).toBe(1)
  })

  it('captures child tables that have no company_id of their own', async () => {
    // quote_items hangs off work_items. Nothing on the row says which tenant it
    // belongs to, so a snapshot built only by scanning for company_id loses it.
    const { co, workItem } = await populated('Archive Test Seven')
    await query(
      `insert into quote_items (work_item_id, name, quantity, unit_price)
       values ($1, 'A line', 2, 100)`,
      [workItem],
    )

    const row = await readArchive(await archive(co.id))
    const items = row.snapshot.quote_items as Array<{ name: string }>
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('A line')
  })

  it('snapshots every table that holds company data', async () => {
    // The completeness guard. A table added later that nobody thinks about
    // fails here rather than going missing from every future restore.
    const { co } = await populated('Archive Test Eight')
    const row = await readArchive(await archive(co.id))

    const tables = await query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    )
    expect(tables.length).toBeGreaterThan(15)

    const missing = tables
      .map((t) => t.table_name)
      .filter((name) => !NOT_COMPANY_DATA.has(name) && !(name in row.snapshot))

    expect(missing, `not archived and not declared exempt: ${missing.join(', ')}`).toEqual([])
  })
})

describe('the tenant boundary', () => {
  it('does not touch another company', async () => {
    const { co } = await populated('Archive Test Neighbour')
    await archive(co.id)

    expect(await count('customers', bystander.id)).toBe(1)
    expect(await count('work_items', bystander.id)).toBe(1)
    expect(await count('catalog_items', bystander.id)).toBe(1)
  })

  it('does not put another company in the snapshot', async () => {
    // The failure nobody would find until a restore, years later.
    const { co } = await populated('Archive Test Isolation')
    const row = await readArchive(await archive(co.id))

    const names = (row.snapshot.customers as Array<{ name: string }>).map((c) => c.name)
    expect(names).toEqual(['Doomed Customer'])
    expect(JSON.stringify(row.snapshot)).not.toContain(bystander.id)
  })

  it('leaves no orphan rows behind', async () => {
    const { co } = await populated('Archive Test Orphans')
    await archive(co.id)

    const tables = await query<{ table_name: string }>(
      `select table_name from information_schema.columns
        where column_name = 'company_id' and table_schema = 'public'
          and table_name <> 'archived_accounts'`,
    )
    for (const { table_name } of tables) {
      expect({ [table_name]: await count(table_name, co.id) }).toEqual({ [table_name]: 0 })
    }
  })

  it('refuses a company that does not exist', async () => {
    await expect(archive(crypto.randomUUID())).rejects.toThrow(/not found/)
  })
})

describe('the archive is not reachable by a tenant', () => {
  it('has RLS on with no policy, so only the service role can read it', async () => {
    const [t] = await query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where relname = 'archived_accounts'`,
    )
    expect(t.relrowsecurity).toBe(true)

    const policies = await query(`select policyname from pg_policies where tablename = $1`, [
      'archived_accounts',
    ])
    expect(policies).toHaveLength(0)
  })
})

describe('deleting a single user', () => {
  it('does not close the company', async () => {
    // A technician closing their own login must not take the business with it.
    const { co } = await populated('Archive Test Survivor')
    const member = await createUser(`leaver-${crypto.randomUUID().slice(0, 8)}@test.local`)
    await setMembership(member.id, co.id, 'technician')

    await query('delete from auth.users where id = $1', [member.id])

    const [company] = await query<{ id: string }>('select id from companies where id = $1', [co.id])
    expect(company.id).toBe(co.id)
    expect(await count('work_items', co.id)).toBe(1)

    await co.cleanup()
  })

  it('keeps work the departing user was assigned, unassigned', async () => {
    const { co, workItem } = await populated('Archive Test Reassign')
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
