# 0010 — Closing an account archives it, it does not delete it

Date: 2026-08-15
Status: Accepted

## Context

Self-serve account deletion is a launch requirement — GDPR Art. 17 and CCPA both
oblige it, and `docs/GTM_BUSINESS_CHECKLIST.md` lists it as a gate.

The first implementation hard-deleted: one `delete from companies`, and Postgres
cascaded the thirteen tables hanging off it. That satisfies the legal
requirement and is trivially correct, but it means a contractor who closes their
account in frustration on a Friday has permanently destroyed years of customer
history, and there is nothing anyone can do on Monday.

## Decision

Closing an account snapshots the whole tenant into `archived_accounts` as a
single JSONB document, then deletes the live rows. The snapshot is retained
permanently.

`archive_and_delete_company(company_id, actor, actor_email)` does both in one
transaction, in that order. The delete cannot happen without the snapshot
committing first.

## Why not a `deleted_at` flag

Soft delete is the obvious alternative and it was rejected.

Tenancy in this codebase is enforced by a hand-written `where company_id = $n`
on every statement, because the `pg` pool connects as superuser and bypasses
RLS. A `deleted_at` column adds a second predicate that every one of those
statements must also remember, doubling a surface we already guard with a
static scanner. The failure mode is a closed company's data quietly reappearing
in a live list.

It is worse than that for the public routes. `/q/{token}` and `/i/{token}` are
unauthenticated and read through the service-role client. A soft-deleted company
would keep serving quotes to strangers until someone remembered to filter there
too.

Moving the rows out avoids all of it. The live schema is untouched, no query
needs a new condition, and a public link 404s because the row genuinely is not
there.

## Consequences

**Restoring is a human operation.** The snapshot is complete, but turning it
back into rows means writing the insert order by hand. This is deliberate — the
product promises "we still have it", not "click here to undo". If restores
become common, that is the signal to build the reverse function.

**The completeness of the snapshot is the whole risk.** A table missing from it
looks exactly like success and is discovered years later, during a restore that
matters. Two things guard it: tables carrying `company_id` are discovered from
`information_schema` rather than listed, so a new one is archived automatically;
and an integration test asserts every table in the schema is either in the
snapshot or explicitly declared as holding no company data.

Child tables that reach a company only through a parent — `quote_items`,
`payments`, `customer_addresses` and four others — cannot be discovered that way
and are listed explicitly in the function, with their join.

**`archived_accounts` holds several tenants' data in one table.** RLS is enabled
with no policy at all, which denies `authenticated` everything and leaves it
reachable only by the service role.

**Retention is indefinite.** The table originally expired archives after 90
days, on the reasoning that an archive nobody ever deletes is itself a
compliance problem. That was reversed by decision on 2026-08-15: the record of a
business that used Rivet is worth keeping, and a contractor returning after two
years should find their history intact rather than just outside a window nobody
told them about. `purge_after` and its index were dropped in
`20260817000000_archives_are_permanent.sql`.

**Erasure is possible but no longer automatic.** A request for real deletion is
served by `delete from archived_accounts where company_id = $1`, which is one
statement. Nothing runs it on a timer.

This is the open risk in this decision and it should be stated plainly: GDPR
Art. 17 and CCPA give a data subject the right to have their data erased, and
indefinite retention with a purely manual deletion path means compliance depends
on someone acting on a request rather than on the system. That is acceptable at
prototype scale with no EU customers. It stops being acceptable the moment there
are, and the fix at that point is a documented erasure runbook and probably an
admin route, not a return to timed purging.

**Closing a single login is unchanged.** Only owners archive a company. Anyone
else deletes their own auth user, their `users` row cascades away with it, and
`work_items.assigned_to` goes null — so the company keeps the job but loses the
record of who was assigned to it. Preserving that attribution would mean
breaking the `users` → `auth.users` cascade, which was out of scope here.
