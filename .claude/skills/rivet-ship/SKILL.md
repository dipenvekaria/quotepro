---
name: rivet-ship
description: Use before opening a Rivet PR, before claiming work is done, or when asked to verify a change. Runs the actual quality gates and checks the failure modes that this codebase produces — tenancy leaks, dead-code edits, missing revalidation, mobile breakage.
---

# Shipping a Change

Evidence before assertions. Run the commands, read the output, then say what's true.

## Gates

```bash
npx tsc --noEmit          # must be clean on live code
npm run lint
npm run build             # catches what tsc misses in RSC boundaries
```

`tsc` will report errors in `src/app/(dashboard)/**` and other dead trees. Those are pre-existing
— check `docs/CODEBASE_MAP.md`. **Your diff must not add any**, and if you touched a file, its
errors are now yours.

`next.config.ts` sets `ignoreBuildErrors: true`, so `npm run build` passing does **not** mean the
types are clean. `tsc --noEmit` is the real gate.

Once the toolchain migration lands (`docs/CLEANUP_PLAN.md` Phase 3): `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm build`.

## Repo-specific review

Work through these against your actual diff, not from memory.

**1. Did you edit dead code?** Every known dead tree has now been deleted, so this is far less
likely than it was — but if something looks unreachable, check `docs/CODEBASE_MAP.md` before
assuming.

**Do not delete a route because nothing imports it.** `src/app/api/**` was listed as dead on
that basis and deleted in Cleanup Phase 1; five live call sites reached it by string —
`fetch('/api/stripe/checkout/...')` from the customer-facing "Pay now" button among them — and
no import ever linked them. Before deleting any route, grep the repo for its *path*:

```bash
grep -rn "api/stripe/checkout" src/
```

**2. Is every query tenant-scoped?**

```bash
git diff --unified=0 | grep -n "query<\|query(" 
```

For each one: does the SQL carry `company_id`, directly or through a join? The `pg` pool
bypasses RLS — there is no safety net. A missing scope is a cross-tenant leak that passes review
unless someone looks for it.

**3. Does every mutation verify ownership first?** Before any `update`/`delete`/child `insert`,
a `select … where id = $1 and company_id = $2` that bails on empty.

**4. Is input validated?** Zod on every server action. Return `{ ok, data } | { ok, error }` —
never throw to the client, never surface a raw Postgres error.

**5. Did you `revalidatePath()`?** Every route whose data changed. A stale pipeline board after a
status change is the classic miss.

**6. Money.** If totals changed, are `subtotal`, `discount_amount`, `tax_amount`, and `total`
all recomputed and written together? `quote_items.total` is generated — you must not write it.

**7. Status.** If you moved a `work_item_status`, did you set the matching timestamp
(`sent_at`, `accepted_at`, `completed_at`, …)? Analytics reads those. Did you avoid writing
`kind`? It's trigger-derived.

**8. Styling.** No raw palette classes:

```bash
git diff | grep -nE "(bg|text|border)-(slate|gray|zinc|neutral|blue|indigo|orange)-[0-9]"
```

Only `status-badge.tsx` is exempt. Everything else uses design tokens.

**9. Secrets.** No keys, tokens, or connection strings in the diff.

## Verify it actually works

Compiling is not working.

- **Exercise the flow in the browser.** The real one, end to end.
- **At 375px.** Device toolbar, touch emulation. Techs use this on a phone.
- **As a second role.** Log in as `office@acme.demo` or `tech@acme.demo`. Permission bugs only
  appear when you switch.
- **As a second company** if you touched data access. Confirm you cannot see the first
  company's rows. This is the check that catches the bug that matters most.
- **Check the database:**
  ```bash
  psql "$DATABASE_URL" -c "select id, status, subtotal, tax_amount, total from work_items order by updated_at desc limit 5"
  ```
- **The customer view** if you touched quotes or invoices: get `public_token` and open
  `/q/<token>` in a private window.
- **Email** goes to Inbucket at http://localhost:54324.

## Migrations

If the diff includes one: `supabase db reset` from scratch (not an incremental apply), then
`npx tsx scripts/verify-rls.ts`, then update `docs/DATA_MODEL.md` in the same PR.

## The PR

Branch off `main`. One concern.

```
fix(pipeline): detail 404 when work item has no address
feat(quotes): tiered good/better/best options
refactor(db): convert settings actions to pg
```

Terse subject, no summary paragraph. Body only if there's something a reviewer can't get from
the diff — a trade-off, a follow-up, a thing you deliberately didn't do.

Include: what you verified and how. "Tested at 375px as office role; confirmed company B can't
read company A's quotes" is worth more than a description of the code.

No new markdown files unless asked. Non-obvious decision → ADR in `docs/adr/`.

## Reporting

Say what you ran and what it printed. If `tsc` fails, show the failure — don't describe the
change as done. If you skipped a check, say which and why. "Builds clean, verified the accept
flow at 375px, did not test Stripe live mode" is a useful report; "all done" is not.

## Update what the change made untrue

Docs here load into agent sessions, so a stale claim does not sit quietly — it gets believed and
acted on. `CLAUDE.md` once led with a finding that no catalog item could be created, while
`catalog/actions.ts` had full CRUD, CSV import and AI extraction.

If the change shipped something a checklist tracks, update the checklist **in the same PR**. A
checklist claiming ❌ for something built sends the next person to rebuild it — that is how a
finished QuickBooks export ended up behind a "Coming soon" label.

Verify status claims against the code on the day you write them, and mark findings **verified**
(you ran it) or **inferred** (you read it).
