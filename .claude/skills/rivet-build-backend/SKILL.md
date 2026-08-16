---
name: rivet-build-backend
description: Use when writing a Server Action, a query, an API route, or anything that reads or writes Postgres. Covers the tenancy, validation, transaction and role rules that this codebase enforces by hand because nothing else will.
---

# Backend Builder

`rivet-data` is the reference for query and mutation patterns; load it for the detail. This is
the build process and the rules that are not negotiable.

## The one that matters

**The `pg` pool connects as superuser and bypasses RLS.** Every statement touching company data
carries `where company_id = $n`, and every mutation verifies the target row belongs to the
caller's company before writing. There is no framework catching a miss — only
`tests/tenancy.test.ts`, which scans the tree and fails the build.

```ts
const { companyId } = await requireSession()
const rows = await query<Row>(
  'select id, total from work_items where id = $1 and company_id = $2',
  [id, companyId],
)
```

Never interpolate into SQL. Parameterised only, always.

## Server Actions

```ts
'use server'

const schema = z.object({ /* … */ })

export async function doThing(input: unknown): Promise<Result> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const session = await getSession()          // returns null; does not redirect
  if (!session) return { ok: false, error: 'Not authenticated' }
  // …
  revalidatePath('/app/…')
  return { ok: true, data }
}
```

- **Zod on every input**, `{ ok: true, data } | { ok: false, error }` out. Never throw to the
  client.
- `getSession()` in actions (returns null), `requireSession()` in pages (redirects). Both read
  the user row via `pg` after Supabase verifies the JWT.
- `revalidatePath` after a write, or the screen keeps showing the old row.

## Roles

Check the gate that matches the data, not the one that is handy:

| Gate | Who |
| --- | --- |
| `canSeeCatalog` | all |
| `canSeeCatalogPrices` | owner, office |
| `canSeeAnalytics` | owner, office |
| `canAssignWork` | owner, office |
| `workItemScope` / `customerScope` | narrows rows per role |

**Withhold in the query, not the markup** — a value behind a JSX conditional still ships to the
browser. The dashboard leaked company revenue to technicians because it read no role at all
while two other screens gated the same numbers.

`workItemScope(scope, startIndex)` emits `$${startIndex + 1}`. The number you pass is **how many
parameters the query already uses**, not the next slot. Getting it wrong is a runtime
`could not determine data type of parameter $N`, invisible to `tsc` — so cover it with an
integration test.

## Idempotence

Ask what a second submit does. `bootstrap_company` is idempotent and returns the existing
company; the catalog seed that ran after it was not, so a double submit stocked the price book
twice — 101 items became 202, in a real contractor's account.

Guard the operation, not just the button. `where not exists (…)` in the insert holds even when
two submits race; a disabled button does not.

## Transactions

`withUser(userId, fn)` sets `request.jwt.claims` inside the transaction and is **required** for
SQL functions that call `auth.uid()` internally — `create_work_item_with_customer`,
`bootstrap_company`. Plain `query()` leaves `auth.uid()` NULL and the function fails oddly.

## `/api` routes

`/api/*` is outside the auth middleware, so the route authenticates itself. Three routes here
were found completely open, each written assuming something else did the checking — and two also
matched on an identifier the caller never sends, so they authenticated nobody and did nothing.
Every route: `getSession()`, derive `company_id` from it, check the role, 404 unknown
parameters.

## Data shape

Money comes back as `number`, timestamps as raw ISO strings — custom parsers in
`src/lib/db/index.ts`. Do not assume `Date`.

Destructive operations archive rather than delete. Account closure copies everything into
`archived_accounts` and keeps it permanently; a data-repair migration that deletes rows copies
them out first. Recovery paths get their restore command written down and tested.

## Done

Typecheck, lint, `npm run test` including the tenancy scan. New data access gets an integration
test in `tests/integration/` that runs the real SQL — that is what caught the scope off-by-one.
