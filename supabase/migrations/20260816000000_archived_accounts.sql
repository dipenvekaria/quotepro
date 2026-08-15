-- Closing an account archives it instead of destroying it.
--
-- The alternative was a deleted_at flag on companies. That was rejected: the pg
-- pool connects as superuser and bypasses RLS, so tenancy is enforced by a
-- hand-written predicate on every statement. Adding a second predicate that
-- every query must also remember would double that surface, and the failure
-- mode is a closed company's data reappearing in a live list.
--
-- Instead the rows leave the live tables entirely and land here as one JSONB
-- snapshot. The live schema stays exactly as it was, nothing needs a new
-- filter, and the public /q and /i token routes cannot serve an archived quote
-- because the row is genuinely no longer there.

create table if not exists archived_accounts (
  id uuid primary key default gen_random_uuid(),

  -- The original ids, deliberately not foreign keys: everything they pointed at
  -- is gone by the time this row is committed.
  company_id uuid not null,
  company_name text not null,
  archived_by uuid,
  archived_by_email text,

  archived_at timestamptz not null default now(),

  -- Erasure still has to be possible. GDPR Art. 17 does not care that we found
  -- the data useful, so an archive that is never purged is not compliant.
  purge_after timestamptz not null default now() + interval '90 days',

  -- Row counts per table, so an archive can be listed and understood without
  -- parsing a snapshot that may be megabytes.
  stats jsonb not null default '{}'::jsonb,

  snapshot jsonb not null
);

create index if not exists archived_accounts_purge_idx on archived_accounts (purge_after);
create index if not exists archived_accounts_company_idx on archived_accounts (company_id);

-- This table holds every tenant's data side by side. No policy is defined on
-- purpose: RLS on with zero policies denies all access to `authenticated`, so
-- only the service role can read it.
alter table archived_accounts enable row level security;

comment on table archived_accounts is
  'Snapshots of closed accounts. Contains multiple tenants'' data — service role only.';

-- ---------------------------------------------------------------------------

create or replace function archive_and_delete_company(
  p_company_id uuid,
  p_actor uuid default null,
  p_actor_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text;
  v_table    text;
  v_rows     jsonb;
  v_snapshot jsonb;
  v_stats    jsonb := '{}'::jsonb;
  v_id       uuid;
  -- Tables that hold company data through a parent rather than a company_id of
  -- their own. The join is what scopes them.
  v_children constant text[][] := array[
    ['customer_addresses', 'customer_id',     'customers'],
    ['catalog_item_labels','catalog_item_id', 'catalog_items'],
    ['promotion_labels',   'promotion_id',    'promotions'],
    ['quote_items',        'work_item_id',    'work_items'],
    ['quote_options',      'work_item_id',    'work_items'],
    ['notification_prefs', 'user_id',         'users'],
    ['payments',           'invoice_id',      'invoices']
  ];
  v_child text[];
begin
  select name into v_name from companies where id = p_company_id;
  if v_name is null then
    raise exception 'company % not found', p_company_id;
  end if;

  select jsonb_build_object('company', to_jsonb(c)) into v_snapshot
    from companies c where c.id = p_company_id;

  -- Discovered rather than listed, so a table added later is archived
  -- automatically instead of being silently dropped on the floor.
  for v_table in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_name = c.table_name and t.table_schema = c.table_schema
     where c.table_schema = 'public'
       and c.column_name = 'company_id'
       and t.table_type = 'BASE TABLE'
       and c.table_name <> 'archived_accounts'
     order by c.table_name
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I x where x.company_id = $1',
      v_table
    ) into v_rows using p_company_id;

    v_snapshot := jsonb_set(v_snapshot, array[v_table], v_rows);
    v_stats    := jsonb_set(v_stats, array[v_table], to_jsonb(jsonb_array_length(v_rows)));
  end loop;

  foreach v_child slice 1 in array v_children
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb)
         from %I x join %I p on p.id = x.%I
        where p.company_id = $1',
      v_child[1], v_child[3], v_child[2]
    ) into v_rows using p_company_id;

    v_snapshot := jsonb_set(v_snapshot, array[v_child[1]], v_rows);
    v_stats    := jsonb_set(v_stats, array[v_child[1]], to_jsonb(jsonb_array_length(v_rows)));
  end loop;

  insert into archived_accounts
    (company_id, company_name, archived_by, archived_by_email, stats, snapshot)
  values
    (p_company_id, v_name, p_actor, p_actor_email, v_stats, v_snapshot)
  returning id into v_id;

  -- Only now. If anything above raised, the caller's transaction rolls back and
  -- the company is still here — losing the data is the one unacceptable outcome.
  delete from companies where id = p_company_id;

  return v_id;
end;
$$;

comment on function archive_and_delete_company is
  'Snapshots a company into archived_accounts, then deletes it. Atomic: the delete cannot happen without the snapshot.';

revoke all on function archive_and_delete_company(uuid, uuid, text) from public, anon, authenticated;
