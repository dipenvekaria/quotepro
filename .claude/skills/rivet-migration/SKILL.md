---
name: rivet-migration
description: Use when changing the Rivet database schema — adding a table or column, changing an enum, writing an RLS policy, adding an index, or creating a SQL function. Covers migration authoring, applying, RLS verification, and the traps specific to work_items.
---

# Schema Changes

Schema lives in `supabase/migrations/`. Four files apply; `legacy/` does not and must never be
run. `00000000000000_baseline.sql` is the canonical schema — read the relevant section before
changing anything.

## Procedure

1. **Write the migration.** `supabase/migrations/YYYYMMDDHHMMSS_snake_case_description.sql`.
   Use a real UTC timestamp so ordering is stable.
2. **Apply locally.** `supabase db reset` — full rebuild from baseline plus seed. Always test
   against a fresh reset, not an incrementally-patched local DB, or you'll ship a migration that
   only works on your machine.
3. **Update the seed** if the change needs data to be exercisable.
4. **Regenerate types** — `supabase gen types typescript --local > src/types/database.types.ts`.
   (Note: the live app reads via raw `pg` and doesn't depend on these, but they're still the
   reference for column names.)
5. **Update queries** that select the changed columns.
6. **Verify RLS** — `npx tsx scripts/verify-rls.ts`. Anon reads must return zero rows.
7. **Update `docs/DATA_MODEL.md`** in the same PR.

## Rules

**Forward-only.** No `down` migrations. A bad migration is fixed by a compensating migration,
never by editing one that has been applied anywhere but your laptop.

**Additive by default.** Add a nullable column, backfill, then add the constraint — three
statements, safe at every point. A `NOT NULL` column with no default on a populated table fails.

**Idempotent where practical.** `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`.

**Never edit `00000000000000_baseline.sql`** once anyone else has a database from it.

**Never touch `supabase/migrations/legacy/`.** It contains `EMERGENCY_DISABLE_RLS.sql` and
`TEMP_BYPASS_RLS.sql`. Running either would disable tenant isolation.

## Every new table needs

```sql
CREATE TABLE public.thing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- ...
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX thing_company_id_idx ON public.thing(company_id);

CREATE TRIGGER thing_set_updated_at
  BEFORE UPDATE ON public.thing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.thing ENABLE ROW LEVEL SECURITY;

CREATE POLICY thing_select ON public.thing
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY thing_write ON public.thing
  FOR ALL USING (company_id = public.get_user_company_id())
        WITH CHECK (company_id = public.get_user_company_id());

COMMENT ON TABLE public.thing IS 'One sentence on what this is for.';
```

`company_id` is not optional. A table without it cannot be tenant-scoped, and every query
against it becomes a leak waiting to happen.

Existing RLS helpers, all `SECURITY DEFINER`: `current_user_id()`, `get_user_company_id()`,
`get_user_role()`, `is_owner_or_office()`, `is_owner()`.

## RLS is the second line, not the first

The application's `pg` pool connects as superuser and bypasses these policies entirely. Write
them anyway — they protect the `anon` and `authenticated` roles used by the public token routes
and Supabase Studio — but do not rely on them to keep tenants apart in application code. That
job belongs to `where company_id = $n`. See the `rivet-data` skill.

## work_items specifics

- **Adding a `work_item_status` value:** `ALTER TYPE ... ADD VALUE` cannot run inside a
  transaction block in older Postgres, and cannot be undone. Then update
  `set_work_item_kind()` so `kind` derives correctly, `src/features/work-items/schemas.ts`,
  and every status→label/colour map in the UI. Grep for the enum name before you assume you've
  found them all.
- **`kind` is trigger-maintained.** Never write it from application code.
- **`quote_items.total` is `GENERATED ALWAYS AS (quantity * unit_price) STORED`.** Never write it.
- **Money is `NUMERIC(12,2)`.** Never `float`.
- **Number columns** (`quote_number`, `invoice_number`, `job_number`) are unique per company and
  `DEFERRABLE INITIALLY DEFERRED`, so renumbering inside a transaction works.

## SQL functions that read auth.uid()

`create_work_item_with_customer`, `bootstrap_company`, and `accept_invitation` call `auth.uid()`
internally. Under the raw pool that returns NULL. Application code must call them inside
`withUser(userId, ...)`. If you write a new function in this shape, say so in a comment on the
function and mention it in the PR.

## Indexes

Add one when a query filters or sorts on the column and the table will grow. `work_items` is
already covered for `(company_id, status)`, `(company_id, kind)`, `(company_id, created_at DESC)`,
`customer_id`, `assigned_to`, `(company_id, scheduled_start)`, and `public_token`.

Check before adding: `EXPLAIN ANALYZE` the actual query. An unused index costs write throughput
for nothing.

## Testing a migration properly

```bash
supabase db reset                       # fresh, from baseline
psql "$DATABASE_URL" -c '\d public.thing'
npx tsx scripts/verify-rls.ts
```

Then exercise the affected UI as two different seeded users. A schema change that passes `\d`
and still breaks the pipeline board is the normal outcome, not the exceptional one.
