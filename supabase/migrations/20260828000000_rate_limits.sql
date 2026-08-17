-- Rate limiting, in Postgres.
--
-- Two surfaces need it and neither has any today. /api/quotes/sign is
-- unauthenticated by design — the 128-bit token is the credential — so anyone
-- holding a quote link can call it as fast as they like. And the AI actions
-- cost real money per call, which makes them the obvious way to run up a bill
-- on someone else's account.
--
-- In Postgres rather than Redis. Redis would be a second service for two
-- part-time people to operate, and the bar for adding a process is a measured
-- problem rather than an anticipated one. At this scale a row and an index are
-- plenty; if that ever stops being true it will show up as lock contention on
-- this table, which is a legible signal rather than a mystery.
--
-- Fixed window rather than sliding. A sliding window needs either a sorted set
-- or a row per request; a fixed window needs one row and gets the answer wrong
-- only at the boundary, where being briefly generous is the harmless direction.

create table if not exists public.rate_limits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

comment on table public.rate_limits is
  'Fixed-window counters. bucket encodes what is limited and for whom, e.g. sign:<token> or ai:<company>.';

-- Old buckets are dead weight, not history. Nothing reads a window that has
-- closed, so anything can prune them; this index makes that cheap.
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- Server-side only. No policy for authenticated or anon: a caller that could
-- read or reset its own limiter would not be limited.
create policy rate_limits_service on public.rate_limits
  for all to service_role using (true) with check (true);
