import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pool, query } from '@/lib/db'

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
 * Do the row-level policies actually work?
 *
 * Nobody knows, because they have never run. The `pg` pool connects as a
 * superuser, which bypasses RLS, and nothing queries with the anon key — so all
 * 75 policies, including the 44 that call `auth.uid()`, are inert. Tenancy is
 * held up entirely by hand-written `where company_id = $n` predicates.
 *
 * Adopting RLS as a real second line means connecting as a role that cannot
 * bypass it. Before betting the application on that, the policies have to be
 * shown to be correct — a policy that has never executed is a policy nobody has
 * tested. This runs them.
 *
 * `set local role authenticated` inside a transaction is exactly the context a
 * restricted connection would have: `authenticated` has `rolbypassrls = false`,
 * and every policy is written `to authenticated`.
 */

let co: TestCompany
let other: TestCompany
let owner: { id: string }
let tech: { id: string }
let otherTech: { id: string }
const ids: Record<string, string> = {}

beforeAll(async () => {
  await requireDatabase()

  co = await createCompany('RLS Co')
  other = await createCompany('RLS Other')
  owner = co.owner

  tech = await createUser(`rls-tech-${crypto.randomUUID().slice(0, 8)}@test.local`)
  otherTech = await createUser(`rls-tech2-${crypto.randomUUID().slice(0, 8)}@test.local`)
  await setMembership(tech.id, co.id, 'technician')
  await setMembership(otherTech.id, co.id, 'technician')

  const mine = await createCustomer(co.id, 'RLS Mine')
  const theirs = await createCustomer(other.id, 'RLS Theirs')

  ids.assignedToTech = (await createWorkItem(co.id, mine, 'job_scheduled', { assignedTo: tech.id })).id
  ids.assignedToOther = (await createWorkItem(co.id, mine, 'job_scheduled', { assignedTo: otherTech.id })).id
  ids.otherCompany = (await createWorkItem(other.id, theirs, 'quote_sent')).id
})

afterAll(async () => {
  await co.cleanup()
  await other.cleanup()
})

/**
 * Runs `sql` the way a restricted connection would: as `authenticated`, with
 * the caller's JWT claims set, inside one transaction so both are LOCAL.
 */
async function asAuthenticated<T = { id: string }>(
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ])
    await client.query('set local role authenticated')
    const res = await client.query(sql, params)
    return res.rows as T[]
  } finally {
    // reset role travels with the rollback; the connection returns clean.
    await client.query('rollback')
    client.release()
  }
}

describe('the policies actually run under a non-bypassing role', () => {
  it('a superuser connection sees everything — this is today', async () => {
    const rows = await query('select id from work_items where id = any($1)', [
      [ids.assignedToTech, ids.assignedToOther, ids.otherCompany],
    ])
    expect(rows).toHaveLength(3)
  })

  it('an owner sees their own company and not another', async () => {
    const rows = await asAuthenticated(owner.id, 'select id from work_items where id = any($1)', [
      [ids.assignedToTech, ids.assignedToOther, ids.otherCompany],
    ])
    const seen = rows.map((r) => r.id)
    expect(seen).toContain(ids.assignedToTech)
    expect(seen).toContain(ids.assignedToOther)
    expect(seen).not.toContain(ids.otherCompany)
  })

  it('a technician sees only work assigned to them', async () => {
    const rows = await asAuthenticated(tech.id, 'select id from work_items where id = any($1)', [
      [ids.assignedToTech, ids.assignedToOther, ids.otherCompany],
    ])
    expect(rows.map((r) => r.id)).toEqual([ids.assignedToTech])
  })

  it("cannot reach another company's row even by guessing its id", async () => {
    const rows = await asAuthenticated(owner.id, 'select id from work_items where id = $1', [
      ids.otherCompany,
    ])
    expect(rows).toHaveLength(0)
  })

  it('an unauthenticated connection sees nothing at all', async () => {
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query('set local role authenticated')
      const res = await client.query('select id from work_items limit 5')
      expect(res.rows).toHaveLength(0)
    } finally {
      await client.query('rollback')
      client.release()
    }
  })

  it('blocks a cross-tenant write, not just a read', async () => {
    // The read path is the obvious risk; the write path is the expensive one.
    const rows = await asAuthenticated(
      owner.id,
      "update work_items set description = 'hijacked' where id = $1 returning id",
      [ids.otherCompany],
    )
    expect(rows).toHaveLength(0)

    const [after] = await query<{ description: string | null }>(
      'select description from work_items where id = $1',
      [ids.otherCompany],
    )
    expect(after.description).not.toBe('hijacked')
  })
})
