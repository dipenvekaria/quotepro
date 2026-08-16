---
name: rivet-test-functional
description: Use when asked to test that something actually works end to end, to verify a flow, to reproduce a bug, or before claiming a feature is done. Walks the real flow in a browser and then checks the database changed — because a screen that looks right and a row that changed are different claims.
---

# Functional Tester

Your job is the gap between *it rendered* and *it happened*.

**A green toast is not evidence.** Confirm the write in Postgres. Every serious bug in this
product's history passed a visual check: the calendar drag animated and saved nothing, the
photo upload showed a spinner and silently exceeded a 1MB body limit, the e-signature route
matched on a column the caller never sends, and mark-paid authenticated nobody.

## The loop

1. **Read the code that runs.** Not the file with the matching name. `/q/[id]` resolves by
   `public_token`; a route matching `.eq('id', quote_id)` casts a 32-hex token to uuid and
   matches zero rows forever.
2. **Do the thing in the browser**, as the role that would do it.
3. **Query the database** and assert the row you expected.
4. **Try it again.** Idempotence is where this codebase breaks — a second onboarding submit
   seeded the whole price book twice, because `bootstrap_company` is idempotent and the seed
   after it was not.
5. **Try it as the wrong person.** Another company's id, another role, an expired token.

```bash
npm run dev
supabase db reset          # demo company, 15 work items, known logins
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "<assertion>"
```

Logins: `owner@acme.demo`, `office@acme.demo`, `tech@acme.demo`, all `demo1234`.

## Flows that must work

Walk these end to end. They are the product.

**Signup → sent quote.** Real signup form, onboarding, trade, AI draft, save, send. Assert:
`companies` row, ~100 `catalog_items`, `work_items.status = 'quote_sent'`, `sent_at` set. This
path is timed — see `company_activation` — and it was 4m 25s.

**Quote → accept → invoice → paid.** Open `/q/{public_token}` unauthenticated. Accept. Assert
`accepted_at`. Then the invoice, then payment. **No live payment has ever been processed**, so
treat any claim that payments work as unverified.

**Invite → join.** Create an invitation, open `/join/{token}` signed out, create the account,
accept. Assert `users.company_id` and `role`. Check the invited address is locked — an account
made under a different address cannot accept, and finds out afterwards.

**Reschedule.** Drag a job in the calendar. Assert `scheduled_start` **and** `scheduled_end`
both moved — moving start past an unchanged end violates `work_items_schedule_order`. Timezone
arithmetic lives in `src/lib/scheduling/day.ts` and has caused two bugs; derive day keys on one
side only.

**AI drafting.** Assert `mode` starts with `gemini`. Without a key it keyword-matches and
reports `mock`, which looks like poor quality rather than an outage.

## Assertions worth writing

Prefer SQL that would fail loudly over eyeballing a screen.

```sql
-- did the send actually happen
select status, sent_at from work_items where id = '<id>';

-- did the seed run twice
select count(*) from catalog_items where company_id = '<id>';

-- can this role see what it should not
select count(*) from work_items where company_id = $1 and $2;  -- $2 = seesMoney
```

## Regression tests

A bug you fixed without a test will come back. Put it in `tests/` — unit for pure logic,
`tests/integration/` for anything touching Postgres.

Write the test so it **fails on the old behaviour**. `tests/integration/catalog-seed-once.test.ts`
asserts 2 items after seeding twice, not 6; that is the assertion the bug would have failed.

The integration harness caught a real off-by-one in a `workItemScope` offset that `tsc` could
not see — it surfaces as `could not determine data type of parameter $N` at runtime. Tests that
run the real SQL earn their keep.

```bash
npm run test           # vitest, incl. integration against local Postgres
npx vitest run tests/integration/<file>
```

## Cleaning up

Delete fixtures you create. Confirm the delete:

```sql
select count(*) as leftover from companies where name = '<fixture>';
```

Seeded rows can carry timestamps that break analytics — the demo company's backdated `sent_at`
made activation read as minus sixty days.

## Reporting

State what you ran, what you asserted, and what you could not check. If a step was skipped —
no credential, no environment — say so rather than presenting an assumption as a pass. When
tests fail, show the output.
