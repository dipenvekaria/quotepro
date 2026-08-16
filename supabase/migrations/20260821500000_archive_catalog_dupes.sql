-- Keep a copy of every catalog row the dedupe is about to remove.
--
-- The next migration (20260822000000) deletes duplicate catalog items created
-- by the double-seed bug. Those rows are a contractor's price book, and the
-- partition that decides which copy survives is reasoning about production
-- data that has only been checked against a local reproduction. If it picks
-- wrong, an item disappears from someone's catalog with nothing to restore
-- from.
--
-- So the rows are copied out first, whole, and kept. This runs before the
-- delete because afterwards there is nothing left to copy.
--
-- Restore, verified as a round trip against a reproduced duplicate set —
-- jsonb_populate_record rather than a hand-written column list, which silently
-- gets NOT NULL columns like `tags` wrong:
--
--   insert into catalog_items
--   select (jsonb_populate_record(null::catalog_items, item)).*
--     from archived_catalog_items
--    where company_id = '<company>' and reason = 'duplicate-starter-seed';

create table if not exists public.archived_catalog_items (
  id            uuid primary key,
  company_id    uuid not null,
  archived_at   timestamptz not null default now(),
  reason        text not null,
  item          jsonb not null
);

comment on table public.archived_catalog_items is
  'Catalog rows removed by data-repair migrations. Retained, not purged. Restore with insert-select from item.';

alter table public.archived_catalog_items enable row level security;

-- No policy for authenticated or anon on purpose: this is an operator-facing
-- recovery table, reached with the service role, and a policy would only be a
-- second door to keep shut. Tenancy is still recorded so a restore can be
-- scoped to one company.
create policy archived_catalog_items_service on public.archived_catalog_items
  for all to service_role using (true) with check (true);

create index if not exists archived_catalog_items_company_idx
  on public.archived_catalog_items (company_id, archived_at desc);

-- Same partition as the delete that follows. Kept identical on purpose: if the
-- two ever disagree, this table is the thing that makes that survivable.
with ranked as (
  select
    ci.id,
    row_number() over (
      partition by ci.company_id, lower(trim(ci.name)), coalesce(ci.category, ''), ci.base_price
      order by
        (ci.image_path is not null) desc,
        (select count(*) from catalog_item_labels l where l.catalog_item_id = ci.id) desc,
        ci.created_at asc,
        ci.id asc
    ) as rn
  from catalog_items ci
)
insert into public.archived_catalog_items (id, company_id, reason, item)
select ci.id, ci.company_id, 'duplicate-starter-seed', to_jsonb(ci)
  from catalog_items ci
  join ranked r on r.id = ci.id
 where r.rn > 1
on conflict (id) do nothing;
