-- Contractor's own tags on a photo, kept separate from the AI's. The person
-- knows their work better than the model, so their tags rank first in search.
alter table public.quote_photos
  add column if not exists user_tags text[] not null default '{}';

create index if not exists quote_photos_user_tags_idx
  on public.quote_photos using gin (user_tags);
