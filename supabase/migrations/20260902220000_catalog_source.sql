-- Where a price book item came from: 'starter' (the onboarding seed),
-- 'import' (their own CSV / extracted paperwork), 'manual'. Lets the app
-- offer to archive untouched starter items once a business brings its own
-- book, without ever touching rows they created or edited.
alter table catalog_items add column if not exists source text;

-- One active item per name per company — what makes re-imports update
-- instead of duplicate. Existing active duplicates: newest survives, older
-- ones are archived (never deleted).
update catalog_items c set is_active = false
 where is_active
   and exists (
     select 1 from catalog_items d
      where d.company_id = c.company_id
        and lower(d.name) = lower(c.name)
        and d.is_active
        and (d.updated_at > c.updated_at or (d.updated_at = c.updated_at and d.id > c.id))
   );

create unique index if not exists catalog_items_company_name_active_idx
  on catalog_items (company_id, lower(name)) where is_active;
