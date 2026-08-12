# Data Model

_Source of truth: `supabase/migrations/00000000000000_baseline.sql` (1,114 lines) plus three
incremental migrations. Verified 2026-08-07._

18 tables, 5 views, 5 enums. Everything hangs off `companies`.

```
companies ──┬── users ────────────────── auth.users (Supabase)
            ├── customers ── customer_addresses
            ├── catalog_items
            └── work_items ──┬── quote_items
                             ├── quote_options
                             └── invoices ── payments

            document_embeddings · activity_log · ai_conversations
            ai_prompts · adk_sessions_v2 · notification_prefs · webhooks_inbound
```

## The lifecycle table

`work_items` is a lead, a quote, a job, and an archive record — always the same row.

```
lead
 └─▶ quote_draft ─▶ quote_sent ─▶ quote_viewed ─┬─▶ quote_accepted ─▶ job_scheduled
                                                ├─▶ quote_rejected      └─▶ job_in_progress
                                                └─▶ quote_expired           └─▶ job_completed
                                                                                 └─▶ archived
                                                                        job_cancelled
```

`status` (enum `work_item_status`) drives everything. `kind` — `lead | quote | job | archived |
unknown` — is maintained from `status` by the `set_work_item_kind()` trigger and exists purely
so board filters and indexes stay cheap. **Never set `kind` by hand.**

Columns worth knowing:

| Column | Note |
| --- | --- |
| `public_token` | `encode(gen_random_bytes(16),'hex')`, unique, NOT NULL. Powers `/q/{token}` and `/i/{token}`. Never expose the UUID. |
| `subtotal`, `discount_amount`, `tax_rate`, `tax_amount`, `total` | `NUMERIC(12,2)`. Written by the app, not computed by the DB. Recompute all five together. |
| `quote_number`, `invoice_number`, `job_number` | Unique per company, `DEFERRABLE INITIALLY DEFERRED` so you can renumber inside a transaction. |
| `scheduled_start` / `scheduled_end` | CHECK enforces end ≥ start. |
| `sent_at`, `viewed_at`, `accepted_at`, `rejected_at`, `completed_at`, `archived_at`, `expires_at` | Lifecycle timestamps. Set them when you move status; analytics reads them. |
| `assigned_to`, `created_by` | → `users.id`, `ON DELETE SET NULL`. |
| `source` | `direct｜phone｜website｜referral｜google_ads｜facebook｜other`. |
| `urgency` | `low｜medium｜high`. |
| `metadata` | JSONB escape hatch. Prefer a real column when a field becomes load-bearing. |

Indexes cover `(company_id, status)`, `(company_id, kind)`, `(company_id, created_at DESC)`,
`customer_id`, `assigned_to` (partial), `(company_id, scheduled_start)` (partial), and
`public_token`. A query filtered only by `company_id` with no second predicate will scan.

## Tenancy

`companies.id` is the tenant key. It appears on `users`, `customers`, `customer_addresses`,
`catalog_items`, `work_items`, `invoices`, `payments`, `document_embeddings`, `activity_log`,
`ai_conversations`, and `notification_prefs`.

`quote_items`, `quote_options`, and `payments` reach it through their parent — which is exactly
why you must verify the parent's `company_id` before writing a child row:

```ts
const owns = await query('select id from work_items where id = $1 and company_id = $2', [id, companyId])
if (!owns[0]) return { ok: false, error: 'Work item not found' }
```

## Tables

**`companies`** — tenant root. `slug` is generated from `name` + id prefix. `settings` JSONB
holds `tax_rate` (default 8.5), `currency`, `timezone`, and an `ai` block with model and
temperature. `plan` is `free｜pro｜team｜enterprise` and is not yet enforced anywhere.

**`users`** — `id` mirrors `auth.users.id`. Carries `company_id`, `role` (enum: `owner`,
`office`, `sales`, `technician`), and a `profile` JSONB with name/phone/avatar. This is the row
`requireSession()` reads.

**`customers`** / **`customer_addresses`** — a customer can have several addresses;
`work_items.address_id` points at the one for this job. The FK is named
`work_items_address_id_fkey` and Supabase embeds must reference it explicitly — getting this
wrong caused the customer-detail 404s.

**`catalog_items`** — the contractor's price book. `base_price`, `unit`, `category`, `tags`,
`is_active`. GIN indexes on `tags` and on `name` with `gin_trgm_ops` for fuzzy search. This is
what the AI is grounded on; quote quality is a direct function of catalog quality.

**`quote_items`** — line items. `total` is `GENERATED ALWAYS AS (quantity * unit_price) STORED`
— never write it. `option_tier` (`good｜better｜best`) supports tiered pricing, `is_upsell` and
`is_discount` drive presentation, `sort_order` drives display order.

**`quote_options`** — good/better/best packages, one row per tier per work item.

**`invoices`** — `invoice_status` enum (`draft｜sent｜partial｜paid｜overdue｜cancelled`).
`work_item_id` is nullable: an invoice can outlive its work item.

**`payments`** — `payment_method` enum (`cash｜check｜card｜bank_transfer｜stripe`). Partial
payments are supported; `invoices.status` becomes `partial`.

**`document_embeddings`** — pgvector over catalog items and past quotes, with a tsvector column
for hybrid search. `match_documents()` RPC does cosine similarity. **Currently unused by the
live app** — the RAG path was built but never wired to anything, and its implementation was deleted with the Python backend.

**`activity_log`** — append-only audit trail.

**`ai_conversations`**, **`ai_prompts`**, **`adk_sessions_v2`** — AI history, versioned prompts,
agent sessions. Only `ai_prompts` is lightly used; the rest belong to the unwired ADK backend.

**`notification_prefs`** — per-user email/SMS preferences.

**`webhooks_inbound`** — raw inbound webhooks with a `webhook_status` enum for idempotent replay.

## Views

| View | Use |
| --- | --- |
| `quote_details_view` | Work item + customer + address + company, denormalised. Detail pages. |
| `job_schedule_view` | Scheduled jobs for calendar rendering. |
| `customer_overview_view` | Customer with aggregate job/revenue counts. |
| `analytics_daily_view` | Daily rollups by status. |
| `ai_cost_view` | Token spend per company. |

## Functions

**`create_work_item_with_customer(...)`** — upserts the customer and address and creates the
work item in one atomic call. Reads `auth.uid()` internally, so it **must** be invoked inside
`withUser(userId, ...)`, not plain `query()`.

**`bootstrap_company(...)`** — first-run company creation during onboarding. Same `withUser`
requirement.

**`accept_invitation(p_token)`** — joins a user to a company from an invite link.

**`handle_new_auth_user()`** — trigger on `auth.users` insert; creates the matching `public.users`
row.

**`match_documents(...)`** — pgvector similarity search. Unused today.

Helpers used by RLS policies: `current_user_id()`, `get_user_company_id()`, `get_user_role()`,
`is_owner_or_office()`, `is_owner()`. All `SECURITY DEFINER`.

## RLS

Every table has RLS enabled, with policies built on `get_user_company_id()`.

**These policies do not protect the application.** The `pg` pool in `src/lib/db/index.ts`
connects as superuser and bypasses them entirely. RLS protects the `anon` and `authenticated`
Postgres roles — the public token routes, Supabase Studio, and any future direct client access.
Application-level `where company_id = $n` is the primary control. See
[ARCHITECTURE.md](ARCHITECTURE.md).

`scripts/verify-rls.ts` asserts an anonymous client reads zero rows from every table. Run it
after any policy change.

## Migrations

Four apply, in `supabase/migrations/`:

```
00000000000000_baseline.sql        the whole schema
20260802000001_signup_bootstrap.sql
20260803000001_stripe_connect.sql
20260806000000_team_invitations.sql
```

`supabase/migrations/legacy/` — 35 pre-rebuild files including `EMERGENCY_DISABLE_RLS.sql` and
`TEMP_BYPASS_RLS.sql` — was deleted on 2026-08-09. It is in git history if ever needed.

New migrations: `YYYYMMDDHHMMSS_description.sql`, forward-only, idempotent where practical.
The `rivet-migration` skill has the full procedure.

## Seed

`supabase/seed.sql` creates one demo company, three users (`owner@`, `office@`, `tech@` at
`acme.demo`, password `demo1234`), a catalog, and 15 work items spread across the lifecycle so
every board column and chart has data. Fixed UUIDs make it re-runnable.
