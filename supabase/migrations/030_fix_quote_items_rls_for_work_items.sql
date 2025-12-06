-- Fix quote_items RLS policies to use work_items table instead of quotes
-- The quotes table was renamed to work_items

-- ============================================
-- QUOTE_ITEMS POLICIES - Updated for work_items
-- ============================================

DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.quote_id
      AND w.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.quote_id
      AND w.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.quote_id
      AND w.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;
CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.quote_id
      AND w.company_id = public.get_user_company_id()
    )
  );
