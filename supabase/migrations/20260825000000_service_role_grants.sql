-- Restore service_role's table privileges on the local stack.
--
-- The public quote and invoice viewers read through the service-role client,
-- and locally that role held only REFERENCES, TRIGGER and TRUNCATE — no SELECT.
-- Every request to /q/{token} and /i/{token} returned 500 with
-- "permission denied for table work_items".
--
-- Production is unaffected: a bogus token there returns 404 (the not-found
-- path, which is only reachable once the SELECT has succeeded), while the same
-- request locally returned 500. Supabase Cloud provisions these grants itself;
-- the local stack lost them somewhere in the migration chain. This statement is
-- therefore a no-op in production and a repair locally.
--
-- It is not cosmetic. Two consecutive product reviews were unable to audit the
-- public quote viewer — the single screen a homeowner uses to accept a
-- five-figure quote, and the one the product can least afford to get wrong —
-- because it would not render on a developer's machine.
--
-- RLS is unaffected. service_role bypasses policies by design and always did;
-- what was missing was the underlying table grant, which is a separate
-- mechanism and fails earlier.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant all privileges on functions to service_role;
