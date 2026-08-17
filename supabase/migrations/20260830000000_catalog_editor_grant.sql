-- Letting somebody other than the owner touch the price book.
--
-- Catalog editing has been owner-only, which is right by default: the price
-- book is the margin. But a salesperson who has just quoted something the
-- catalog does not carry is the person who knows it should be in there, and
-- making them ask the owner every time is how a price book stays wrong.
--
-- A per-person grant rather than a role change. Widening `sales` as a role
-- would hand the price book to every salesperson at every company, including
-- the ones the owner has not decided to trust yet. This way the default stays
-- closed and the owner opens it for the people they choose.
--
-- Owners are not affected by the column at all — they can always edit, and a
-- grant that could be revoked from an owner would be a way to lock a company
-- out of its own pricing.
alter table public.users
  add column if not exists can_edit_catalog boolean not null default false;

comment on column public.users.can_edit_catalog is
  'Owner-granted permission to edit the price book. Ignored for owners, who always can.';
