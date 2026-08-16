-- Drive time between two places, cached.
--
-- The calendar wants "how long from this job to the next one for the same
-- person". Asking Google every render would be both slow and billed: the Routes
-- API is about $5 per 1,000 requests, and a week grid for one contractor can
-- easily ask thirty times. Against $111/month of total infrastructure that is
-- not a rounding error.
--
-- Addresses do not move, so the answer is cacheable almost indefinitely. A
-- contractor works the same few neighbourhoods, which means the hit rate climbs
-- fast and the steady-state cost is close to zero.
--
-- Deliberately keyed on rounded coordinates rather than address ids. Two
-- customers on the same street produce the same drive time, and rounding to
-- four decimal places (~11 m) collapses them into one cache entry instead of
-- N². It is also tenant-agnostic on purpose — the distance between two points
-- is not anybody's private data, and sharing the cache across companies is
-- what makes it cheap.

create table if not exists public.travel_estimates (
  id           uuid primary key default gen_random_uuid(),
  origin_key   text not null,
  dest_key     text not null,
  seconds      integer not null check (seconds >= 0),
  meters       integer check (meters >= 0),
  source       text not null default 'google_routes',
  created_at   timestamptz not null default now(),
  unique (origin_key, dest_key)
);

comment on table public.travel_estimates is
  'Cached drive times between rounded coordinate pairs. Not tenant data: a distance belongs to nobody.';
comment on column public.travel_estimates.origin_key is
  'lat,lng rounded to 4dp (~11m), so nearby jobs share one entry.';

-- The only access pattern: look up one pair.
create index if not exists travel_estimates_pair_idx
  on public.travel_estimates (origin_key, dest_key);

alter table public.travel_estimates enable row level security;

-- Written and read through the service role from the server only. No policy for
-- `authenticated`: nothing reaches this with a user token, and a policy would be
-- a second door to keep shut.
create policy travel_estimates_service on public.travel_estimates
  for all to service_role using (true) with check (true);

-- Coordinates for an address, so a drive time can be asked for at all.
-- `geocode` already existed on customer_addresses and was never written by
-- anything — no row had one. These are explicit columns instead, because a
-- jsonb blob nothing reads is how the first attempt went unnoticed.
alter table public.customer_addresses
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.customer_addresses.lat is
  'Captured from the Places details call at address entry — same Basic Data tier, no extra cost.';
