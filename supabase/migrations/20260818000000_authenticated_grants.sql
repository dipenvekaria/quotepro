-- Give the `authenticated` role the privileges its own policies assume.
--
-- Found by running the row-level policies for the first time. There are 75 of
-- them and 44 call auth.uid(), but none had ever executed: the app connects as
-- a superuser, which bypasses RLS entirely. Connecting as `authenticated`
-- instead failed before any policy was consulted —
--
--     ERROR: permission denied for table work_items
--
-- because the role held TRUNCATE, TRIGGER and REFERENCES on every table and no
-- SELECT, INSERT, UPDATE or DELETE on any of them. It could not read a row and
-- could empty a table.
--
-- This makes the grants match the intent: DML on tenant tables, so the policies
-- decide which rows; and TRUNCATE revoked, because nothing reached through a
-- user session should ever be able to empty one.
--
-- The application still connects as superuser today. This is the prerequisite
-- for changing that, not the change itself.

-- 1. Take back the dangerous one, everywhere.
revoke truncate on all tables in schema public from authenticated, anon;

-- 2. Tenant tables: the policies already restrict the rows.
do $$
declare
  t text;
  -- archived_accounts holds several tenants' snapshots and has RLS on with no
  -- policy at all, which denies `authenticated` by design. Granting DML would
  -- be harmless today and a trap the first time someone adds a policy to it.
  excluded constant text[] := array['archived_accounts', 'webhooks_inbound', 'adk_sessions_v2'];
begin
  for t in
    select table_name from information_schema.tables
     where table_schema = 'public'
       and table_type = 'BASE TABLE'
       and table_name <> all (excluded)
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- 3. Views are read-only projections of the same rows.
do $$
declare v text;
begin
  for v in
    select table_name from information_schema.views where table_schema = 'public'
  loop
    execute format('grant select on public.%I to authenticated', v);
  end loop;
end $$;

-- 4. Sequences, or an insert fails on the id it is allowed to write.
grant usage, select on all sequences in schema public to authenticated;

-- Anything created later inherits the same shape rather than the defaults that
-- produced this.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
