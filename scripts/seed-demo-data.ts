/**
 * Fills a company with believable data so every screen has something in it.
 *
 * Built for testing a real account — the one you signed up with — rather than
 * the local demo company, so it takes a target company and writes only inside
 * it. Every row it creates is tagged in `metadata.seed`, which is what makes
 * `--undo` possible: nothing else in the table carries that mark, so the
 * cleanup cannot reach data you typed yourself.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-demo-data.ts --company <uuid>
 *   DATABASE_URL=... npx tsx scripts/seed-demo-data.ts --email you@example.com
 *   DATABASE_URL=... npx tsx scripts/seed-demo-data.ts --email you@... --undo
 *
 * It refuses to run without an explicit target. There is no default company,
 * because a seeding script that guesses is one that eventually seeds the wrong
 * tenant.
 */

import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

const SEED_TAG = 'demo-seed-v1'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const has = (name: string) => args.includes(`--${name}`)

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  // Supabase's pooler chain is not in the default trust store and `pg` treats
  // sslmode=require as verify-full, so a hosted run dies without this.
  ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    ? undefined
    : { rejectUnauthorized: false },
})

const q = <T = unknown>(sql: string, params: unknown[] = []) =>
  pool.query<T extends object ? T : never>(sql, params).then((r) => r.rows)

// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { name: 'Angela Reyes', phone: '+1-512-555-0142', email: 'angela.reyes@example.com', address: '4412 Bluebonnet Ln', city: 'Austin', state: 'TX', zip: '78704' },
  { name: 'Marcus Webb', phone: '+1-512-555-0177', email: 'm.webb@example.com', address: '908 Wheless Ln', city: 'Austin', state: 'TX', zip: '78723' },
  { name: 'Priya Nair', phone: '+1-512-555-0163', email: 'priya.nair@example.com', address: '2201 Ashdale Dr', city: 'Austin', state: 'TX', zip: '78757' },
  { name: 'Tom Brennan', phone: '+1-512-555-0119', email: 'tbrennan@example.com', address: '15 Circle Ave', city: 'Round Rock', state: 'TX', zip: '78664' },
  { name: 'Dana Kowalski', phone: '+1-512-555-0198', email: 'dana.k@example.com', address: '7734 Bishop Rd', city: 'Cedar Park', state: 'TX', zip: '78613' },
  { name: 'Ray Okafor', phone: '+1-512-555-0155', email: 'ray.okafor@example.com', address: '311 Fairway St', city: 'Austin', state: 'TX', zip: '78745' },
  { name: 'Helen Vasquez', phone: '+1-512-555-0121', email: 'hvasquez@example.com', address: '1120 Clayton Ln', city: 'Austin', state: 'TX', zip: '78723' },
  { name: 'Nathan Cole', phone: '+1-512-555-0186', email: 'ncole@example.com', address: '6002 Shoal Creek Blvd', city: 'Austin', state: 'TX', zip: '78757' },
]

/** Believable jobs, priced so the totals look like a real book of business. */
const JOBS = [
  { desc: 'AC not cooling — upstairs unit, 12yr old system', line: 'Diagnostic + capacitor replacement', qty: 1, price: 289, hours: 1.5 },
  { desc: 'Full system replacement — 3 ton, single stage', line: '3-ton condenser + air handler, installed', qty: 1, price: 8450, hours: 16 },
  { desc: 'Annual maintenance, two systems', line: 'Precision tune-up (per system)', qty: 2, price: 129, hours: 1 },
  { desc: 'Water heater leaking at the base', line: '50gal gas water heater, installed', qty: 1, price: 1875, hours: 4 },
  { desc: 'Ductwork inspection — uneven cooling', line: 'Duct inspection + sealing, main trunk', qty: 1, price: 640, hours: 3 },
  { desc: 'Thermostat upgrade, smart', line: 'Smart thermostat supply + install', qty: 1, price: 415, hours: 1.5 },
  { desc: 'Furnace making noise on startup', line: 'Blower motor replacement', qty: 1, price: 720, hours: 2.5 },
  { desc: 'New build rough-in — 4 zones', line: 'Rough-in per zone', qty: 4, price: 1150, hours: 24 },
  { desc: 'Emergency — no heat, family with infant', line: 'After-hours diagnostic + ignitor', qty: 1, price: 465, hours: 2 },
  { desc: 'Mini split for converted garage', line: 'Ductless mini split 12k BTU, installed', qty: 1, price: 3250, hours: 8 },
  { desc: 'Coil cleaning, restaurant rooftop', line: 'RTU coil clean + filter change', qty: 1, price: 540, hours: 3 },
  { desc: 'Quote for two-stage system upgrade', line: '4-ton two-stage system, installed', qty: 1, price: 11200, hours: 20 },
]

/** Spread across every stage so no screen is empty. */
const PLAN: { status: string; job: number; customer: number; daysAgo: number; scheduleInDays?: number }[] = [
  { status: 'lead', job: 0, customer: 0, daysAgo: 1 },
  { status: 'lead', job: 8, customer: 1, daysAgo: 0 },
  { status: 'lead', job: 5, customer: 2, daysAgo: 3 },
  { status: 'quote_draft', job: 1, customer: 3, daysAgo: 2 },
  { status: 'quote_draft', job: 11, customer: 4, daysAgo: 4 },
  { status: 'quote_sent', job: 3, customer: 5, daysAgo: 5 },
  { status: 'quote_sent', job: 9, customer: 6, daysAgo: 8 },
  { status: 'quote_viewed', job: 4, customer: 7, daysAgo: 6 },
  { status: 'quote_accepted', job: 6, customer: 0, daysAgo: 9 },
  { status: 'job_scheduled', job: 2, customer: 1, daysAgo: 10, scheduleInDays: 1 },
  { status: 'job_scheduled', job: 7, customer: 2, daysAgo: 12, scheduleInDays: 3 },
  { status: 'job_scheduled', job: 10, customer: 3, daysAgo: 7, scheduleInDays: 5 },
  { status: 'job_in_progress', job: 0, customer: 4, daysAgo: 14, scheduleInDays: 0 },
  { status: 'job_completed', job: 3, customer: 5, daysAgo: 21, scheduleInDays: -3 },
  { status: 'job_completed', job: 5, customer: 6, daysAgo: 30, scheduleInDays: -12 },
  { status: 'job_completed', job: 1, customer: 7, daysAgo: 45, scheduleInDays: -25 },
]

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000)

async function resolveCompany(): Promise<{ id: string; name: string }> {
  const byId = flag('company')
  if (byId) {
    const [row] = await q<{ id: string; name: string }>('select id, name from companies where id = $1', [byId])
    if (!row) throw new Error(`No company with id ${byId}`)
    return row
  }

  const email = flag('email')
  if (!email) throw new Error('Pass --company <uuid> or --email <you@example.com>.')

  const rows = await q<{ id: string; name: string }>(
    `select c.id, c.name from companies c
       join users u on u.company_id = c.id
       join auth.users au on au.id = u.id
      where lower(au.email) = lower($1)`,
    [email],
  )
  if (rows.length === 0) throw new Error(`No company found for ${email}`)
  if (rows.length > 1) throw new Error(`${email} belongs to several companies — pass --company instead`)
  return rows[0]
}

async function undo(companyId: string) {
  // work_items and customers both carry the tag; deleting the customers takes
  // their addresses and cascades nothing else, and work_items are removed first
  // so no FK blocks the delete.
  const items = await q<{ n: string }>(
    `with gone as (
       delete from work_items
        where company_id = $1 and metadata->>'seed' = $2
        returning 1
     ) select count(*)::text as n from gone`,
    [companyId, SEED_TAG],
  )
  const customers = await q<{ n: string }>(
    `with gone as (
       delete from customers
        where company_id = $1 and metadata->>'seed' = $2
        returning 1
     ) select count(*)::text as n from gone`,
    [companyId, SEED_TAG],
  )
  console.log(`Removed ${items[0].n} work items and ${customers[0].n} customers.`)
}

async function seed(companyId: string) {
  const [owner] = await q<{ id: string }>(
    `select id from users where company_id = $1 order by case role when 'owner' then 0 else 1 end limit 1`,
    [companyId],
  )
  const ownerId = owner?.id ?? null

  const [tax] = await q<{ tax_rate: string | null }>(
    `select (settings->>'tax_rate') as tax_rate from companies where id = $1`,
    [companyId],
  )
  const taxRate = Number(tax?.tax_rate ?? 8.25)

  // Customers
  const customerIds: string[] = []
  for (const c of CUSTOMERS) {
    const [row] = await q<{ id: string }>(
      `insert into customers (company_id, name, email, phone, metadata)
       values ($1, $2, $3, $4, jsonb_build_object('seed', $5::text))
       returning id`,
      [companyId, c.name, c.email, c.phone, SEED_TAG],
    )
    customerIds.push(row.id)
    await q(
      `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
       values ($1, $2, $3, $4, $5, true)`,
      [row.id, c.address, c.city, c.state, c.zip],
    )
  }
  console.log(`Created ${customerIds.length} customers.`)

  // Work items across every stage
  let quoteNo = Math.floor(Date.now() / 1000) % 100000
  let made = 0
  const invoiceable: { id: string; customerId: string; total: number; subtotal: number; taxAmount: number }[] = []

  for (const p of PLAN) {
    const job = JOBS[p.job]
    const customerId = customerIds[p.customer]
    const subtotal = job.qty * job.price
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100
    const createdAt = daysFromNow(-p.daysAgo).toISOString()

    const scheduledStart =
      p.scheduleInDays === undefined ? null : (() => {
        const d = daysFromNow(p.scheduleInDays)
        d.setHours(9, 0, 0, 0)
        return d.toISOString()
      })()
    const scheduledEnd = scheduledStart
      ? new Date(new Date(scheduledStart).getTime() + job.hours * 3_600_000).toISOString()
      : null

    const [item] = await q<{ id: string }>(
      `insert into work_items
         (company_id, customer_id, status, source, urgency, quote_number, description,
          subtotal, tax_rate, tax_amount, total, public_token,
          scheduled_start, scheduled_end, assigned_to, created_by,
          created_at, updated_at, metadata)
       values ($1,$2,$3::work_item_status,$4,$5,$6,$7,
               $8,$9,$10,$11,$12,
               $13,$14,$15,$15,
               $16,$16, jsonb_build_object('seed', $17::text))
       returning id`,
      [
        companyId, customerId, p.status,
        ['website', 'phone', 'referral', 'google_ads'][made % 4],
        ['low', 'medium', 'high'][made % 3],
        `Q-${++quoteNo}`, job.desc,
        subtotal, taxRate, taxAmount, total, randomUUID().replace(/-/g, ''),
        scheduledStart, scheduledEnd, ownerId,
        createdAt, SEED_TAG,
      ],
    )

    // Line items, so a quote opens onto something real rather than an empty table.
    if (p.status !== 'lead') {
      await q(
        `insert into quote_items (work_item_id, name, description, quantity, unit_price, labor_hours)
         values ($1, $2, $3, $4, $5, $6)`,
        [item.id, job.line, job.desc, job.qty, job.price, job.hours],
      )
    }

    if (p.status === 'job_completed') {
      invoiceable.push({ id: item.id, customerId, total, subtotal, taxAmount })
    }
    made++
  }
  console.log(`Created ${made} work items across ${new Set(PLAN.map((p) => p.status)).size} stages.`)

  // Invoices on completed jobs: one paid, one part-paid, one overdue — so the
  // money screens have all three states rather than a single happy path.
  const states: { status: string; paidFraction: number; dueInDays: number }[] = [
    { status: 'paid', paidFraction: 1, dueInDays: -10 },
    { status: 'partial', paidFraction: 0.4, dueInDays: 6 },
    { status: 'overdue', paidFraction: 0, dueInDays: -9 },
  ]

  let invNo = Math.floor(Date.now() / 1000) % 100000
  for (let i = 0; i < invoiceable.length && i < states.length; i++) {
    const w = invoiceable[i]
    const s = states[i]
    const amountPaid = Math.round(w.total * s.paidFraction * 100) / 100

    const [inv] = await q<{ id: string }>(
      `insert into invoices
         (company_id, work_item_id, customer_id, invoice_number, subtotal, tax_amount, total,
          amount_paid, status, due_date, sent_at, paid_at, public_token, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::invoice_status,$10,$11,$12,$13,
               jsonb_build_object('seed', $14::text))
       returning id`,
      [
        companyId, w.id, w.customerId, `INV-${++invNo}`,
        w.subtotal, w.taxAmount, w.total, amountPaid, s.status,
        daysFromNow(s.dueInDays).toISOString(),
        daysFromNow(s.dueInDays - 14).toISOString(),
        s.status === 'paid' ? daysFromNow(s.dueInDays - 2).toISOString() : null,
        randomUUID().replace(/-/g, ''), SEED_TAG,
      ],
    )

    if (amountPaid > 0) {
      await q(
        `insert into payments (invoice_id, amount, method, reference_number, notes, recorded_by)
         values ($1, $2, $3, $4, $5, $6)`,
        [inv.id, amountPaid, i === 0 ? 'card' : 'check', `REF-${1000 + i}`, 'Seeded test payment', ownerId],
      )
    }
  }
  console.log(`Created ${Math.min(invoiceable.length, states.length)} invoices (paid, partial, overdue) with payments.`)
}

async function main() {
  const company = await resolveCompany()
  const target = connectionString!.includes('localhost') || connectionString!.includes('127.0.0.1')
    ? 'LOCAL'
    : 'REMOTE'
  console.log(`Target: ${company.name} (${company.id}) on ${target} database\n`)

  if (has('undo')) {
    await undo(company.id)
  } else {
    await seed(company.id)
    console.log(`\nAll rows tagged metadata.seed = '${SEED_TAG}'. Remove them with --undo.`)
  }
  await pool.end()
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e)
  await pool.end()
  process.exit(1)
})
