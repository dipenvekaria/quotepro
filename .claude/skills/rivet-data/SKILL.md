---
name: rivet-data
description: Use when reading or writing Rivet application data — adding a query, a server action, or any SQL against work_items, customers, catalog_items, invoices. Covers the pg data layer, mandatory tenant scoping, transactions, and the server action contract. Read this BEFORE writing data-access code, not after.
---

# Rivet Data Access

## The rule that matters

**The `pg` pool connects as superuser and bypasses Row Level Security.**

RLS policies exist on every table and are correct, but they protect the `anon` and
`authenticated` Postgres roles — not `query()`. Nothing catches a missing tenant filter.
A forgotten `where company_id = $n` is a cross-tenant data leak that compiles, passes review,
and looks fine in local testing against a single seeded company.

Every statement touching company data carries `company_id`. Every mutation verifies ownership
of the target row before writing.

## Getting the tenant

```ts
import { requireSession, getSession } from '@/lib/auth/session'
```

| | Use in | On failure |
| --- | --- | --- |
| `requireSession()` | Server Components, pages | Redirects to `/login` or `/app/onboarding` |
| `getSession()` | Server actions | Returns `null` — caller returns `{ ok: false }` |

Both return `{ userId, email, companyId, role, profile }`. Supabase verifies the JWT; the
`users` row is then read through `pg`.

Don't re-query the user's company. It's already in the session object. Several action files do
this redundantly — don't copy that.

## Reading

```ts
import { query } from '@/lib/db'

type QuoteRow = {
  id: string
  job_name: string | null
  status: string
  total: number        // numeric arrives as number, not string
  created_at: string   // timestamptz arrives as ISO string, not Date
}

const { companyId } = await requireSession()

const quotes = await query<QuoteRow>(
  `select id, job_name, status, total, created_at
     from work_items
    where company_id = $1
      and kind = $2
    order by created_at desc
    limit $3`,
  [companyId, 'quote', 50],
)
```

- Always type the result. `query<Row>` — otherwise everything is `any`.
- Always parameterized. No interpolation, ever — including `ORDER BY`. If sort is dynamic, map
  the input through a whitelist to a literal column name.
- Custom type parsers live in `src/lib/db/index.ts`: `numeric` → `number`,
  `date`/`timestamp`/`timestamptz` → raw ISO `string`.

For child tables, join up to the tenant rather than trusting the parent id:

```ts
const items = await query<ItemRow>(
  `select qi.id, qi.name, qi.quantity, qi.unit_price
     from quote_items qi
     join work_items wi on wi.id = qi.work_item_id
    where qi.work_item_id = $1
      and wi.company_id = $2
    order by qi.sort_order`,
  [workItemId, companyId],
)
```

## Writing

Server actions live in `actions.ts` next to the route that uses them.

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query, withTransaction } from '@/lib/db'

const schema = z.object({
  work_item_id: z.string().uuid(),
  status: z.enum(['quote_sent', 'quote_accepted', 'job_scheduled']),
})

export async function updateStatus(input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  // Ownership check — pg bypasses RLS, so scope the row to the company.
  const owns = await query<{ id: string }>(
    'select id from work_items where id = $1 and company_id = $2',
    [parsed.data.work_item_id, session.companyId],
  )
  if (!owns[0]) return { ok: false as const, error: 'Not found' }

  await query(
    'update work_items set status = $1::work_item_status, updated_at = now() where id = $2',
    [parsed.data.status, parsed.data.work_item_id],
  )

  revalidatePath('/app/pipeline')
  return { ok: true as const, data: { id: parsed.data.work_item_id } }
}
```

The contract, in full:

1. Zod-validate the input. The client is untrusted even though you wrote it.
2. `getSession()`, bail if null.
3. Verify ownership before writing.
4. Mutate.
5. `revalidatePath()` every route whose data changed.
6. Return `{ ok: true as const, data } | { ok: false as const, error }`. Never throw.
7. Never surface a raw Postgres error to the client — it leaks schema. Map it to something a
   contractor can read.

## Transactions

Multi-statement writes go in `withTransaction`. Rollback on any throw is automatic.

```ts
await withTransaction(async (q) => {
  await q('delete from quote_items where work_item_id = $1', [id])
  for (const [i, item] of items.entries()) {
    await q(
      `insert into quote_items (work_item_id, name, quantity, unit_price, sort_order)
       values ($1, $2, $3, $4, $5)`,
      [id, item.name, item.quantity, item.unit_price, i],
    )
  }
  await q(
    'update work_items set subtotal = $1, tax_amount = $2, total = $3 where id = $4',
    [subtotal, taxAmount, total, id],
  )
})
```

## withUser — when auth.uid() must resolve

Some SQL functions read `auth.uid()` internally. Under the raw pool that is NULL and they fail.
`withUser` opens a transaction and sets `request.jwt.claims` inside it first.

```ts
const workItemId = await withUser(session.userId, async (q) => {
  const rows = await q<{ id: string }>(
    `select create_work_item_with_customer(
       p_company_id => $1, p_customer_name => $2, p_description => $3,
       p_status => $4::work_item_status
     ) as id`,
    [companyId, name, description, 'quote_draft'],
  )
  return rows[0]?.id
})
```

Functions that require it: `create_work_item_with_customer`, `bootstrap_company`,
`accept_invitation`. If a function errors with a null-user complaint, this is why.

## Money

`subtotal`, `discount_amount`, `tax_amount`, and `total` are written by the application, not
computed by the database. Recompute all four together and write them in one statement — a
partial update leaves a quote whose numbers don't add up, and the customer sees that.

`quote_items.total` **is** generated (`quantity * unit_price`, stored). Never write it.

Round at the boundary, on `NUMERIC(12,2)`. Don't accumulate float error across line items.

## Status transitions

`work_items.status` drives the whole product. Cast explicitly — `$1::work_item_status`.

When you move status, set the matching timestamp: `sent_at`, `viewed_at`, `accepted_at`,
`rejected_at`, `completed_at`, `archived_at`. Analytics reads those columns, and a missing one
makes a quote invisible in reporting.

Never write `kind` — the `set_work_item_kind()` trigger derives it from `status`.

## The public token exception

`/q/[id]` and `/i/[id]` run unauthenticated, so there is no session to scope by. They use the
service-role Supabase client (`src/lib/supabase/untyped.ts`) and look rows up by
`work_items.public_token` — 128 random bits, never the UUID.

The token is the authorisation. This is a deliberate exception to "everything goes through
`pg`", not a leftover. Don't generalise it: any route with a session uses `query()` and
`companyId`.

## Before you finish

- Every `query()` in the diff carries `company_id`, directly or via a join.
- Every mutation verified ownership first.
- Results are typed, inputs are Zod-validated.
- `revalidatePath()` covers the affected routes.
- `npx tsc --noEmit` is clean.
- Manually: log in as a second company in the seed data and confirm you cannot see the first
  company's rows.

## Roles — which rows, and which columns

Tenancy answers *whose company*. Roles answer *which of it*, and this codebase forgets the
second. The dashboard read no role at all and shipped company revenue, close rate, pipeline
value and every unpaid invoice to technicians, while two other screens gated the same numbers.

| Gate | Who |
| --- | --- |
| `canSeeCatalog` | all roles |
| `canSeeCatalogPrices` | owner, office |
| `canSeeAnalytics` | owner, office |
| `canAssignWork` | owner, office |
| `workItemScope` / `customerScope` | narrow rows per role |

**Withhold in the query, never the markup.** A value behind a JSX conditional is still in the
HTML payload and readable in devtools — which is exactly the export the gate exists to prevent.

```ts
const seesMoney = canSeeAnalytics(role as UserRole)
await query('select … where company_id = $1 and created_at >= $2 and $3', [companyId, since, seesMoney])
```

**`workItemScope(scope, startIndex)` emits `$${startIndex + 1}`.** The number you pass is how
many parameters the query *already* uses, not the next slot. Getting it wrong is a runtime
`could not determine data type of parameter $N` — invisible to `tsc`, so cover new scoped queries
with an integration test that runs the real SQL.

Unrecognised roles must fail closed. `workItemScope` returns `and false`; keep it that way.

## Idempotence

Ask what a second submit does, because users double-tap, reload, and hit back.

`bootstrap_company` is idempotent and hands back the existing company. The catalog seed that ran
after it was not, and `catalog_items` has no uniqueness — so a second onboarding submit stocked
the price book twice. 101 items became 202, in a real contractor's account.

Guard the operation, not the button. `where not exists (…)` inside the insert holds even when two
submits race; a disabled button does not.

## Destructive operations archive

Data is retained in archived form rather than deleted. Account closure copies everything into
`archived_accounts` and keeps it permanently. A repair migration that deletes rows copies them out
first, and writes its restore command into the migration header — use
`jsonb_populate_record(null::table, item)` rather than a hand-written column list, which silently
gets NOT NULL columns wrong.
