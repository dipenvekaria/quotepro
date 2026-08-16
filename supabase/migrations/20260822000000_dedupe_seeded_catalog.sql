-- Remove catalog items the onboarding seed inserted twice.
--
-- bootstrap_company() is idempotent and returns the existing company to a
-- caller who already has one. The seed that ran afterwards was not, and had no
-- uniqueness to stop it, so a second onboarding submit inserted the whole
-- starter price book again. A residential HVAC account showed 202 items across
-- 13 categories where the starter carries 101 across the same 13 — every item
-- listed twice, at the same price, in the contractor's own catalog.
--
-- The write path is fixed in src/app/app/onboarding/actions.ts. This clears
-- what already landed.
--
-- Only exact duplicates go: same company, same name, same category, same
-- price. Two genuinely different items that happen to share a name are left
-- alone, because a contractor may well have priced the same job differently
-- for two categories and that is theirs to decide, not ours.
--
-- Which copy survives matters. A duplicate may have picked up labels or a
-- photo since — catalog_item_labels cascades on delete, so dropping the wrong
-- row would silently take a contractor's own work with it. Keep whichever copy
-- carries an image or labels, and fall back to the oldest.

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
delete from catalog_items
 where id in (select id from ranked where rn > 1);
