-- QuickBooks Online, bookkeeping-only: Rivet pushes invoices and payments
-- into the company's QBO; nothing flows back and no money moves through it.

create table if not exists quickbooks_connections (
  company_id       uuid primary key references companies(id) on delete cascade,
  realm_id         text not null,
  access_token     text not null,
  refresh_token    text not null,
  access_expires_at timestamptz not null,
  -- The generic Service item Rivet bills under; created on first sync.
  qbo_item_id      text,
  connected_by     uuid references users(id) on delete set null,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  last_error       text
);

-- Tokens never leave the server: RLS deny-all, PostgREST revoked. The app
-- reads through the pg superuser pool like everything else.
alter table quickbooks_connections enable row level security;
revoke all on quickbooks_connections from anon, authenticated;

-- QBO ids for idempotent sync.
alter table customers add column if not exists qbo_customer_id text;
alter table invoices  add column if not exists qbo_invoice_id  text;
alter table payments  add column if not exists qbo_payment_id  text;
