-- Close the PostgREST view surface.
--
-- 20260818000000 granted SELECT on every view to `authenticated` on the stated
-- premise that "views are read-only projections of the same rows" — i.e. that
-- RLS on the underlying tables would still decide which rows come back. It
-- does not. A view without `security_invoker` executes as its owner, and the
-- owner (postgres) bypasses RLS, so the grant exposed every tenant's rows —
-- quotes, customers, revenue, and quote_details_view.public_token, which is
-- the credential for /q/{token} — to any signed-in user via the REST API that
-- Supabase publishes for every granted relation. The app itself never queries
-- these views; PostgREST was the only reader.
--
-- Two layers, because each alone has already failed once:
--   1. security_invoker on every view, so RLS applies as the querying role
--      even if a grant ever reappears.
--   2. No privileges for anon/authenticated on any view, so the REST surface
--      is closed outright.
-- tests/integration/postgrest-surface.test.ts asserts both for every view in
-- the schema, so the next view added fails CI unless it opts in deliberately.

do $$
declare
  v text;
begin
  for v in select table_name from information_schema.views where table_schema = 'public'
  loop
    execute format('alter view public.%I set (security_invoker = on)', v);
    execute format('revoke all on public.%I from authenticated, anon', v);
  end loop;
end $$;

-- The same migration made future relations inherit DML for `authenticated`.
-- "Tables" in default privileges includes views, so every later view would be
-- auto-granted and leak again. Revoke ALL rather than just DML: the platform's
-- own defaults also hand TRUNCATE/REFERENCES/TRIGGER to new relations, which
-- restores the very TRUNCATE that 20260818000000 revoked. Future relations
-- inherit nothing; tenant tables get their grants explicitly in the migration
-- that creates them.
alter default privileges in schema public
  revoke all on tables from authenticated, anon;
