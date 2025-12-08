-- ============================================
-- COMPLETE FIX - Restore access and fix role system
-- ============================================

-- STEP 1: Drop ALL duplicate RLS policies on work_items
DROP POLICY IF EXISTS "work_items_select_policy" ON work_items;
DROP POLICY IF EXISTS "work_items_insert_policy" ON work_items;
DROP POLICY IF EXISTS "work_items_update_policy" ON work_items;
DROP POLICY IF EXISTS "work_items_delete_policy" ON work_items;
DROP POLICY IF EXISTS "Users can view own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can insert own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can update own company work items" ON work_items;
DROP POLICY IF EXISTS "Users can delete own company work items" ON work_items;

-- STEP 2: Fix helper functions (no companies.user_id dependency)
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_owner_or_office() CASCADE;
DROP FUNCTION IF EXISTS public.can_delete() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_settings() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id_result UUID;
BEGIN
  SELECT company_id INTO company_id_result
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN company_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role_result TEXT;
BEGIN
  SELECT role::text INTO user_role_result
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role_result, 'technician');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner_or_office()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() IN ('owner', 'office');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_delete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_settings()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- STEP 3: Create simple working RLS policies
CREATE POLICY "work_items_select_policy" ON work_items
  FOR SELECT
  USING (
    -- Users can view their company's work items based on role
    company_id = public.get_user_company_id()
    AND (
      -- Owner/Office see everything
      public.get_user_role() IN ('owner', 'office')
      OR
      -- Sales sees only their own leads/quotes
      (public.get_user_role() = 'sales' AND created_by = auth.uid())
      OR
      -- Technician sees only their assigned work (simplified - all company items for now)
      public.get_user_role() = 'technician'
    )
  );

CREATE POLICY "work_items_insert_policy" ON work_items
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() IN ('owner', 'office', 'sales')
  );

CREATE POLICY "work_items_update_policy" ON work_items
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      public.get_user_role() IN ('owner', 'office')
      OR (public.get_user_role() = 'sales' AND created_by = auth.uid())
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
      public.get_user_role() IN ('owner', 'office')
      OR (public.get_user_role() = 'sales' AND created_by = auth.uid())
    )
  );

CREATE POLICY "work_items_delete_policy" ON work_items
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND public.can_delete()
  );

SELECT 'Fix complete! Now add yourself to team_members table using ADD_YOURSELF_AS_OWNER.sql' as status;
