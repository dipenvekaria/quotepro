-- A line the salesperson priced, because the price book could not.
--
-- When the catalog cannot cover what was asked, the quote used to simply leave
-- it off and say so. That is correct about the price book and useless in a
-- driveway: the customer asked for a Nest, the business fits thermostats, and
-- "not in your price book" is not an answer anybody can sell.
--
-- So the line goes on the quote with a price derived from the contractor's own
-- comparable item and their own markup, flagged as an estimate. The salesperson
-- accepts it, changes it, or drops it — they make the call, not the model.
--
-- **The flag is internal.** The customer sees a normal line at whatever price
-- the salesperson settled on. A quote that tells a homeowner part of it is
-- guesswork invites them to negotiate it, and it is not true by the time it is
-- sent: someone has looked at it. Nothing under src/app/q or src/app/i may read
-- this column.
alter table public.quote_items
  add column if not exists is_estimate boolean not null default false,
  -- What the estimate was derived from, so the contractor can judge it and the
  -- price book nudge can say something specific.
  add column if not exists estimate_basis text;

comment on column public.quote_items.is_estimate is
  'INTERNAL ONLY. Never render on the public quote or PDF — the customer sees a firm price.';

-- Who put an item in the price book, and who last touched it.
--
-- Catalog editing is about to widen beyond owners, so "who added this" stops
-- being obvious. Nullable because every existing row predates the question, and
-- set null on delete because a departed user must not take their catalog with
-- them.
alter table public.catalog_items
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists updated_by uuid references public.users(id) on delete set null;

create index if not exists catalog_items_created_by_idx
  on public.catalog_items (company_id, created_by)
  where created_by is not null;
