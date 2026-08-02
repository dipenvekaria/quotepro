-- ============================================
-- COMPREHENSIVE RLS FIX - December 8, 2025
-- ============================================
-- Purpose: Fix all RLS policy issues blocking queries
-- Tables: work_items, team_members, activity_log, quote_items
-- ============================================

-- ============================================
-- STEP 1: Verify helper functions exist
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM team_members 
  WHERE user_id = auth.uid() 
  AND company_id = public.get_user_company_id()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- STEP 2: Fix TEAM_MEMBERS policies
-- ============================================

-- Drop existing policies
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
    OR
    user_id = auth.uid() -- Can always see own membership
  );

-- INSERT: Owner can add team members
CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- UPDATE: Owner can update team member roles
CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- DELETE: Owner can remove team members
CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- ============================================
-- STEP 3: Fix WORK_ITEMS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can insert own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can update own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can delete own company work items" ON work_items;
DROP POLICY IF EXISTS work_items_select_policy ON work_items;
DROP POLICY IF EXISTS work_items_insert_policy ON work_items;
DROP POLICY IF EXISTS work_items_update_policy ON work_items;
DROP POLICY IF EXISTS work_items_delete_policy ON work_items;

-- SELECT: All users in company can see work items
CREATE POLICY work_items_select_policy ON work_items
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
  );

-- INSERT: All users can create work items
CREATE POLICY work_items_insert_policy ON work_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id()
  );

-- UPDATE: All users can update work items in their company
CREATE POLICY work_items_update_policy ON work_items
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
  );

-- DELETE: Only owner can delete
CREATE POLICY work_items_delete_policy ON work_items
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- ============================================
-- STEP 4: Fix ACTIVITY_LOG policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS activity_log_select_policy ON activity_log;
DROP POLICY IF EXISTS activity_log_insert_policy ON activity_log;

-- SELECT: All users can view activity logs for their company
CREATE POLICY activity_log_select_policy ON activity_log
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
  );

-- INSERT: All authenticated users can create activity logs
CREATE POLICY activity_log_insert_policy ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_user_company_id()
  );

-- No UPDATE or DELETE (append-only audit log)

-- ============================================
-- STEP 5: Fix QUOTE_ITEMS policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;

-- SELECT: Via work_items relationship
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

-- INSERT: Via work_items relationship
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

-- UPDATE: Via work_items relationship
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

-- DELETE: Via work_items relationship
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
-- STEP 6: Fix CUSTOMERS policies
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
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- ============================================
-- STEP 7: Fix COMPANIES policies
-- ============================================

DROP POLICY IF EXISTS companies_select_policy ON companies;
DROP POLICY IF EXISTS companies_insert_policy ON companies;
DROP POLICY IF EXISTS companies_update_policy ON companies;

CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_company_id()
    OR NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) -- Allow during onboarding
  );

CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) -- Only during onboarding
  );

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  table_name TEXT;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS Policy Verification';
  RAISE NOTICE '============================================';
  
  FOR table_name IN 
    SELECT unnest(ARRAY['team_members', 'work_items', 'activity_log', 'quote_items', 'customers', 'companies'])
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = table_name;
    
    RAISE NOTICE '✅ % has % policies', table_name, policy_count;
  END LOOP;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS Fix Complete';
  RAISE NOTICE '============================================';
END $$;
