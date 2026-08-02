-- ============================================
-- TEMPORARY: Bypass RLS for Testing
-- Run this IMMEDIATELY after the role migration
-- ============================================

-- Temporarily disable RLS on all tables for authenticated users
-- This gives you full access while testing

-- work_items: Allow all access temporarily
DROP POLICY IF EXISTS work_items_select_policy ON work_items;
DROP POLICY IF EXISTS work_items_insert_policy ON work_items;
DROP POLICY IF EXISTS work_items_update_policy ON work_items;
DROP POLICY IF EXISTS work_items_delete_policy ON work_items;

CREATE POLICY work_items_select_policy ON work_items
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY work_items_insert_policy ON work_items
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY work_items_update_policy ON work_items
  FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY work_items_delete_policy ON work_items
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- quote_items: Allow all access temporarily
DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;

CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
    )
  );

-- catalog_items: Allow all access temporarily
DROP POLICY IF EXISTS catalog_items_select_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_insert_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_update_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_delete_policy ON catalog_items;

CREATE POLICY catalog_items_select_policy ON catalog_items
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_insert_policy ON catalog_items
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_update_policy ON catalog_items
  FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_delete_policy ON catalog_items
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- team_members: Allow all access temporarily
DROP POLICY IF EXISTS team_members_select_policy ON team_members;
DROP POLICY IF EXISTS team_members_insert_policy ON team_members;
DROP POLICY IF EXISTS team_members_update_policy ON team_members;
DROP POLICY IF EXISTS team_members_delete_policy ON team_members;

CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- companies: Allow all access temporarily
DROP POLICY IF EXISTS companies_update_policy ON companies;

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id());

-- ============================================
-- NOTE: After testing, re-run the role migration
-- to restore proper role-based permissions
-- ============================================
