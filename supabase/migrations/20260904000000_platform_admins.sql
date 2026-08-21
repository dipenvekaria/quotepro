-- Platform admin allow-list for the /admin console. Cross-tenant surface,
-- gated by email; the app checks membership on every request. RLS deny-all:
-- only the service connection reads it.
create table if not exists platform_admins (
  email text primary key,
  added_by text,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

insert into platform_admins (email, added_by)
values ('dipenvekaria@gmail.com', 'seed')
on conflict (email) do nothing;
