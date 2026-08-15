import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

/**
 * Fixtures for the integration suite.
 *
 * Every test builds its own company and tears it down, so a failure never
 * leaves state that makes the next run lie. Nothing here touches the demo
 * company — a suite that mutates seed data is one `db reset` away from being
 * unreproducible.
 */

export type TestUser = { id: string; email: string }

export type TestCompany = {
  id: string
  owner: TestUser
  cleanup: () => Promise<void>
}

const INSTANCE = '00000000-0000-0000-0000-000000000000'

/** Creates an auth user. `public.users` is populated by a trigger. */
export async function createUser(email: string): Promise<TestUser> {
  const id = randomUUID()
  await query(
    `insert into auth.users (id, email, instance_id, aud, role)
     values ($1, $2, $3, 'authenticated', 'authenticated')`,
    [id, email, INSTANCE],
  )
  return { id, email }
}

export async function setMembership(
  userId: string,
  companyId: string | null,
  role: 'owner' | 'office' | 'sales' | 'technician',
) {
  await query('update public.users set company_id = $1, role = $2 where id = $3', [
    companyId,
    role,
    userId,
  ])
}

export async function createCompany(name = 'Test Co'): Promise<TestCompany> {
  const id = randomUUID()
  await query(`insert into companies (id, name, settings) values ($1, $2, $3::jsonb)`, [
    id,
    name,
    JSON.stringify({ tax_rate: 10 }),
  ])

  const owner = await createUser(`owner-${id.slice(0, 8)}@test.local`)
  await setMembership(owner.id, id, 'owner')

  return {
    id,
    owner,
    cleanup: async () => {
      // Ordered so foreign keys never block the teardown.
      await query('delete from quote_photos where company_id = $1', [id])
      await query('delete from quote_items where work_item_id in (select id from work_items where company_id = $1)', [id])
      await query('delete from quote_options where work_item_id in (select id from work_items where company_id = $1)', [id])
      await query('delete from payments where invoice_id in (select id from invoices where company_id = $1)', [id])
      await query('delete from invoices where company_id = $1', [id])
      await query('delete from work_items where company_id = $1', [id])
      await query('delete from customer_addresses where customer_id in (select id from customers where company_id = $1)', [id])
      await query('delete from customers where company_id = $1', [id])
      await query('delete from catalog_item_labels where catalog_item_id in (select id from catalog_items where company_id = $1)', [id])
      await query('delete from promotion_labels where promotion_id in (select id from promotions where company_id = $1)', [id])
      await query('delete from promotions where company_id = $1', [id])
      await query('delete from catalog_labels where company_id = $1', [id])
      await query('delete from catalog_items where company_id = $1', [id])
      await query('delete from invitations where company_id = $1', [id])
      // Removing the auth user cascades to public.users.
      await query('delete from auth.users where id in (select id from public.users where company_id = $1)', [id])
      await query('delete from public.users where company_id = $1', [id])
      await query('delete from companies where id = $1', [id])
    },
  }
}

export async function createCustomer(companyId: string, name: string, phone?: string) {
  const rows = await query<{ id: string }>(
    `insert into customers (company_id, name, phone) values ($1, $2, $3) returning id`,
    [companyId, name, phone ?? null],
  )
  return rows[0].id
}

export async function createWorkItem(
  companyId: string,
  customerId: string,
  status = 'quote_draft',
  extra: { assignedTo?: string | null; total?: number } = {},
) {
  const rows = await query<{ id: string; public_token: string }>(
    `insert into work_items
       (company_id, customer_id, status, kind, description, public_token, quote_number, assigned_to, total)
     values ($1, $2, $3::work_item_status, 'quote', 'Test job', $4, $5, $6, $7)
     returning id, public_token`,
    [
      companyId,
      customerId,
      status,
      randomUUID().replace(/-/g, ''),
      `Q-${randomUUID().slice(0, 8)}`,
      extra.assignedTo ?? null,
      extra.total ?? 0,
    ],
  )
  return rows[0]
}

export async function createCatalogItem(companyId: string, name: string, price: number) {
  const rows = await query<{ id: string }>(
    `insert into catalog_items (company_id, name, base_price, unit)
     values ($1, $2, $3, 'each') returning id`,
    [companyId, name, price],
  )
  return rows[0].id
}

/** Runs `fn` as if `userId` were the signed-in user, for functions using auth.uid(). */
export async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: userId }),
  ])
  try {
    return await fn()
  } finally {
    await query(`select set_config('request.jwt.claims', '', false)`)
  }
}
