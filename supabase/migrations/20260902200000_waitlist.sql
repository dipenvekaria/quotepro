-- Pre-launch interest capture from the public homepage. Global, not
-- tenant-scoped: these are strangers, not customers yet.
create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text,
  created_at timestamptz not null default now()
);
alter table waitlist enable row level security;
revoke all on waitlist from anon, authenticated;
