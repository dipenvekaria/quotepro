-- Which catalog item a quote line came from.
--
-- quote_items copies name, price and labor_hours at the moment the line is
-- added, which is right — a quote must not change because the price book did
-- afterwards. But it kept no reference back, so nothing could answer "what does
-- this job need loading onto the van".
--
-- That question is the technician materials list, and without this column it
-- would need matching on name, which breaks the first time somebody renames an
-- item or types a line by hand.
--
-- Nullable and ON DELETE SET NULL on purpose: hand-typed lines have no catalog
-- item, and deleting a catalog item must not delete history of what was quoted.
alter table public.quote_items
  add column if not exists catalog_item_id uuid
    references public.catalog_items(id) on delete set null;

create index if not exists quote_items_catalog_item_idx
  on public.quote_items (catalog_item_id)
  where catalog_item_id is not null;

comment on column public.quote_items.catalog_item_id is
  'Source catalog row. Nullable: hand-typed lines have none. Prices are still copied, not read through.';
