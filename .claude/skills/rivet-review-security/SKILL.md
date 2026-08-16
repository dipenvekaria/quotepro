---
name: rivet-review-security
description: Use when asked for a security review, a vulnerability check, or before shipping anything that touches auth, tenancy, roles, public routes, payments or customer data. Checks the specific ways this codebase has actually leaked, not a generic OWASP list.
---

# Security & Vulnerability Reviewer

Rivet holds two parties' data: the contractor's book of business, and homeowners' names,
addresses, phone numbers and photographs of the inside of their houses. A leak here is somebody
else's customers.

**The structural fact that drives everything: the `pg` pool connects as superuser and bypasses
RLS.** RLS is a second line of defence. The first is a hand-written `where company_id = $n` on
every statement, and there is no framework catching a miss.

## Run the guards first

```bash
npm run test                     # tests/tenancy.test.ts fails the build on an unscoped statement
npx tsx scripts/verify-rls.ts    # policies actually confine
npm run typecheck
```

`tests/tenancy.test.ts` statically scans every SQL statement in the tree. If it flags something,
either add the predicate or add an `EXEMPT` entry **stating why it cannot leak** — an exemption
without a reason is a silenced alarm. Token-scoped public reads are legitimate exemptions; the
128-bit token is the credential.

## Tenancy

Every statement touching company data carries `company_id`. Every mutation verifies the target
row belongs to the caller's company **before** writing.

```ts
const { companyId } = await requireSession()
const rows = await query('select … where id = $1 and company_id = $2', [id, companyId])
```

Cross-check that a scanner cannot: a query joining two tables may scope one and not the other.

## Roles — the failure mode this codebase repeats

Gates exist and screens forget to call them. `canSeeAnalytics` guarded revenue on `/app/analytics`
while **the dashboard read no role at all** and shipped the same revenue, close rate, pipeline
value and every unpaid invoice to technicians — on the page everyone lands on after signing in.

For each screen and action, ask: *which roles reach this, and what does each see?*

| Gate | Who |
| --- | --- |
| `canSeeCatalog` | all roles |
| `canSeeCatalogPrices` | owner, office |
| `canSeeAnalytics` | owner, office |
| `canAssignWork` | owner, office |
| `workItemScope` / `customerScope` | narrows rows per role |

**Withhold in the query, never the markup.** A price behind a JSX conditional is still in the
HTML payload and readable in devtools — that is exactly the export the gate exists to prevent.

Unrecognised roles must fail closed. `workItemScope` returns `and false`; keep that.

## Public and `/api` routes

`/api/*` sits outside the auth middleware, so each route authenticates itself. **Three routes
here were found completely open**, each written assuming something else did the checking:
mark-paid, accept and sign. Two of them also matched on an identifier their caller never sends,
so they authenticated nobody *and* did nothing.

For every route under `src/app/api/**`:

- Does it call `getSession()` and reject?
- Does it derive `company_id` from the session rather than the body?
- Does it check a role where the data warrants it?
- Unknown parameters → 404, not a leak.

Verify by hand, unauthenticated:

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/export/invoices   # expect 401
```

Public token routes (`/q/{token}`, `/i/{token}`, `/join/{token}`) are unauthenticated by design.
The token is the credential: 128-bit, unguessable, never the UUID. Confirm expired and consumed
tokens return nothing.

## Rate limiting

**Absent.** Anyone holding a quote token can hammer accept, sign, and the AI actions. AI calls
cost money and are the obvious abuse target. This is an open P0 in
`docs/GTM_BUSINESS_CHECKLIST.md` §5.12.

## Input

Server Actions validate with Zod and return `{ ok, data } | { ok, error }` — they never throw to
the client. Parameterised SQL only; never interpolate. Bound anything that reaches a query from
a URL: the `?next=` parameter on `/login` feeds a token to a server action and must reject
absolute URLs, protocol-relative URLs and traversal.

CSV exports prefix `=`, `+`, `-`, `@` — a customer name is otherwise a formula on the
bookkeeper's machine.

## Secrets

**The GitHub repo is public.** Never commit a key, and never put project ids, account ids,
emails or hostnames in a document — `docs/SECURITY_REVIEW.md` carries a standing note about this
after they were published once.

```bash
git diff | grep -iE 'sk-|sbp_|GOCSPX|BEGIN .*PRIVATE KEY|api[_-]?key\s*='
```

Keys the user adds themselves via `vercel env add`. Do not ask for them in chat.

## Storage and PII

Quote photos live in a private bucket behind short-lived signed URLs. A public URL is permanent,
unauthenticated, and outlives the quote, the customer and the account — these are photographs of
people's homes, and one forward makes them public forever.

## Reporting

Write findings into `docs/SECURITY_REVIEW.md`. Rank by what an attacker actually gets. Separate
**confirmed by running it** from **read in the code**. Give each finding a concrete failure
scenario — "a technician opens /app/dashboard and reads company revenue" beats "insufficient
access control".

No infrastructure identifiers in that file. It is public.
