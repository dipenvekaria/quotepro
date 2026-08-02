-- ============================================
-- RLS FIX V2 - Simpler approach without role checks
-- ============================================

-- Fix helper function (simpler version)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- TEAM_MEMBERS - Simple policies
-- ============================================

DROP POLICY IF EXISTS "Users can view their company team members" ON team_members;
DROP POLICY IF EXISTS "Admins can invite team members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team member roles" ON team_members;
DROP POLICY IF EXISTS "Admins can remove team members" ON team_members;
DROP POLICY IF EXISTS team_members_select_policy ON team_members;
DROP POLICY IF EXISTS team_members_insert_policy ON team_members;
DROP POLICY IF EXISTS team_members_update_policy ON team_members;
DROP POLICY IF EXISTS team_members_delete_policy ON team_members;

-- SELECT: All authenticated users can see team members in their company
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    OR user_id = auth.uid()
  );

-- INSERT/UPDATE/DELETE: All company members can manage (simplified)
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

-- ============================================
-- WORK_ITEMS - Simple policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can insert own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can update own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can delete own company work items" ON work_items;
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

-- ============================================
-- ACTIVITY_LOG - Simple policies
-- ============================================

DROP POLICY IF EXISTS activity_log_select_policy ON activity_log;
DROP POLICY IF EXISTS activity_log_insert_policy ON activity_log;

CREATE POLICY activity_log_select_policy ON activity_log
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY activity_log_insert_policy ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================
-- QUOTE_ITEMS - Via work_items
-- ============================================

DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;

CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items 
      WHERE id = quote_items.work_item_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_items 
      WHERE id = quote_items.work_item_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items 
      WHERE id = quote_items.work_item_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_items 
      WHERE id = quote_items.work_item_id 
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- CUSTOMERS - Simple policies
-- ============================================

DROP POLICY IF EXISTS customers_select_policy ON customers;
DROP POLICY IF EXISTS customers_insert_policy ON customers;
DROP POLICY IF EXISTS customers_update_policy ON customers;
DROP POLICY IF EXISTS customers_delete_policy ON customers;

CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- ============================================
-- COMPANIES - Allow onboarding
-- ============================================

DROP POLICY IF EXISTS companies_select_policy ON companies;
DROP POLICY IF EXISTS companies_insert_policy ON companies;
DROP POLICY IF EXISTS companies_update_policy ON companies;

CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_company_id()
    OR NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id());

-- Verify
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('team_members', 'work_items', 'activity_log', 'quote_items', 'customers', 'companies')
GROUP BY tablename
ORDER BY tablename;
