-- ============================================================================
-- companies.trade  +  catalog_items.trade
-- ============================================================================
-- Which trade a contractor operates as, and which trade a catalog item came
-- from. Both hold the same stable slug — `residential-hvac-service-and-repair`
-- — matching a filename in `data/starter-catalogs/`.
--
-- A real column rather than a settings key, per docs/DATA_MODEL.md: it is read
-- on the quoting path, which is the hot path, and it decides which items the
-- model is allowed to see.
--
-- On catalog_items it is deliberately NULLABLE, and null means "always
-- eligible". Anything the contractor adds by hand or imports from their own
-- spreadsheet has no trade, and must never be filtered out of their own quotes
-- — the trade tag exists to exclude *other* trades' starter items, not to
-- exclude the contractor's real price book.
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trade TEXT;

COMMENT ON COLUMN public.companies.trade IS
  'Stable trade slug chosen at onboarding, matching data/starter-catalogs/<slug>.csv. Null for accounts created before trades existed.';

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS trade TEXT;

COMMENT ON COLUMN public.catalog_items.trade IS
  'Trade this item was seeded from. NULL means the contractor created it and it is eligible for every quote.';

-- Quote generation reads active items for one company, optionally narrowed to
-- its trade. Partial on is_active because inactive items are never quoted.
CREATE INDEX IF NOT EXISTS catalog_items_company_trade_idx
  ON public.catalog_items (company_id, trade)
  WHERE is_active;
