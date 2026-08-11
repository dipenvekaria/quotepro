-- ============================================================================
-- Catalog writes are owner-only
-- ============================================================================
-- src/lib/permissions.ts has always said `canEditCatalog: false` for the office
-- role ("Cannot edit pricing"), while catalog_items_write and
-- catalog_items_update allowed is_owner_or_office(). The application and the
-- database therefore disagreed about who may change prices.
--
-- The pg pool bypasses RLS, so the application check is what actually applies
-- today — but anyone reasoning from the schema got the opposite answer, and RLS
-- is meant to be the second line of defence rather than a contradiction of the
-- first.
--
-- Resolved in favour of the stricter reading: pricing is the contractor's
-- margin, and loosening a permission later is easy where tightening one after
-- people rely on it is not.
-- ============================================================================

DROP POLICY IF EXISTS catalog_items_write ON public.catalog_items;
DROP POLICY IF EXISTS catalog_items_update ON public.catalog_items;

CREATE POLICY catalog_items_write ON public.catalog_items FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner());

CREATE POLICY catalog_items_update ON public.catalog_items FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() AND public.is_owner())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_owner());

-- catalog_items_delete already required is_owner(); left as-is.
