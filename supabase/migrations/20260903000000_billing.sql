-- Subscription billing state, synced from Stripe by webhook. `plan` already
-- existed (text) — it becomes 'solo' | 'team' once a subscription exists.
alter table companies add column if not exists stripe_customer_id text;
alter table companies add column if not exists stripe_subscription_id text;
alter table companies add column if not exists subscription_status text;
alter table companies add column if not exists trial_ends_at timestamptz;
create index if not exists companies_stripe_customer_idx on companies (stripe_customer_id);
