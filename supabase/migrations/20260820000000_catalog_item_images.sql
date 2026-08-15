-- A picture on a catalog item.
--
-- Not decoration: a technician standing in a utility room explaining why the
-- customer needs a particular part has nothing to point at. A photo of the item
-- does more than any description, and it is the contractor's own photo of the
-- thing they actually fit.
--
-- Stored as a path into the same private bucket the quote photos use, so it is
-- served through short-lived signed URLs and never becomes a permanent public
-- link.

alter table catalog_items add column if not exists image_path text;

comment on column catalog_items.image_path is
  'Object path in the quote-photos bucket. Served via signed URL; never public.';
