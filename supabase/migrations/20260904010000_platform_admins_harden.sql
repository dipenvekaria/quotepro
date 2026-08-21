-- Hardening from the security review of /admin.

-- Belt over the default privileges: the only reader is the superuser pool.
revoke all on platform_admins from anon, authenticated;

-- Platform-level audit trail. activity_log requires a company; admin actions
-- have none, so they get their own ledger. Append-only by convention.
create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);
alter table admin_audit enable row level security;
revoke all on admin_audit from anon, authenticated;
