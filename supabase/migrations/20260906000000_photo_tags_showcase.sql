-- Job photos become a portfolio. AI describes each photo (general, trade-
-- agnostic tags) and the contractor opts individual photos into a showcase
-- they can pull up in front of a prospect. Default out: these are photos of a
-- customer's property, so nothing appears to other prospects unless chosen.
alter table public.quote_photos
  add column if not exists tags text[] not null default '{}',
  add column if not exists in_showcase boolean not null default false,
  add column if not exists tagged_at timestamptz;

create index if not exists quote_photos_tags_idx on public.quote_photos using gin (tags);
create index if not exists quote_photos_showcase_idx
  on public.quote_photos (company_id) where in_showcase;
