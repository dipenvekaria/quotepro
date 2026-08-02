-- ============================================
-- MIGRATION: Role-Based Permissions System
-- Date: 2025-12-07
-- Purpose: Implement 4-role system for contractor teams
-- ============================================

-- ROLES:
-- 1. owner     - Full access to everything
-- 2. office    - Can manage leads, quotes, calendar, jobs. Cannot delete or change settings
-- 3. sales     - Can create leads and quotes (their own only). Cannot see others' work
-- 4. technician - Can only see assigned jobs. Cannot access quotes, leads, pricing

-- ============================================
-- STEP 1: Update Role Enum (Safe Migration)
-- ============================================

-- First, create the new enum type with a different name
CREATE TYPE user_role_new AS ENUM ('owner', 'office', 'sales', 'technician');

-- Drop the default constraint first
ALTER TABLE team_members ALTER COLUMN role DROP DEFAULT;

-- Convert existing team_members.role to new enum
-- Map old roles: 'admin' -> 'office', 'sales' -> 'sales'
ALTER TABLE team_members 
  ALTER COLUMN role TYPE user_role_new 
  USING (
    CASE role::text
      WHEN 'admin' THEN 'office'::user_role_new
      WHEN 'sales' THEN 'sales'::user_role_new
      ELSE 'technician'::user_role_new
    END
  );

-- Set new default after type conversion
ALTER TABLE team_members ALTER COLUMN role SET DEFAULT 'technician'::user_role_new;

-- Drop old enum and rename new one
DROP TYPE IF EXISTS user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- ============================================
-- STEP 2: Update team_members Table
-- ============================================

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

COMMENT ON COLUMN team_members.role IS 'User role: owner (full access), office (manage operations), sales (own leads/quotes), technician (assigned jobs only)';

-- ============================================
-- STEP 3: Helper Functions
-- ============================================

-- Get user's role in their company
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- Check if user is company owner
  IF EXISTS (
    SELECT 1 FROM companies 
    WHERE user_id = auth.uid()
  ) THEN
    RETURN 'owner'::user_role;
  END IF;
  
  -- Check team_members table
  SELECT role INTO user_role_result
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role_result, 'technician'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role IS 'Returns current user role (owner, office, sales, technician)';

-- Check if user is owner or office (full operational access)
CREATE OR REPLACE FUNCTION public.is_owner_or_office()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() IN ('owner', 'office');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can delete (owner only)
CREATE OR REPLACE FUNCTION public.can_delete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can access settings/catalog (owner only)
CREATE OR REPLACE FUNCTION public.can_manage_settings()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 4: Update RLS Policies for work_items (Leads, Quotes, Jobs)
-- ============================================

-- DROP existing work_items policies
DROP POLICY IF EXISTS work_items_select_policy ON work_items;
DROP POLICY IF EXISTS work_items_insert_policy ON work_items;
DROP POLICY IF EXISTS work_items_update_policy ON work_items;
DROP POLICY IF EXISTS work_items_delete_policy ON work_items;

-- SELECT Policy: Role-based visibility
CREATE POLICY work_items_select_policy ON work_items
  FOR SELECT
  USING (
    CASE public.get_user_role()
      -- Owner & Office: See everything in their company
      WHEN 'owner' THEN company_id = public.get_user_company_id()
      WHEN 'office' THEN company_id = public.get_user_company_id()
      
      -- Sales: Only see their own leads and quotes
      WHEN 'sales' THEN (
        company_id = public.get_user_company_id() AND
        created_by = auth.uid() AND
        status IN ('lead', 'quoted', 'sent', 'accepted', 'archived')
      )
      
      -- Technician: Only see jobs assigned to them
      WHEN 'technician' THEN (
        company_id = public.get_user_company_id() AND
        assigned_to = auth.uid() AND
        status IN ('scheduled', 'in_progress', 'completed')
      )
      
      ELSE false
    END
  );

-- INSERT Policy: Who can create work items
CREATE POLICY work_items_insert_policy ON work_items
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id() AND
    CASE public.get_user_role()
      -- Owner & Office: Can create anything
      WHEN 'owner' THEN true
      WHEN 'office' THEN true
      
      -- Sales: Can only create leads and quotes (mark as their own)
      WHEN 'sales' THEN (
        status IN ('lead', 'quoted') AND
        created_by = auth.uid()
      )
      
      -- Technician: Cannot create work items
      WHEN 'technician' THEN false
      
      ELSE false
    END
  );

-- UPDATE Policy: Who can update work items
CREATE POLICY work_items_update_policy ON work_items
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id() AND
    CASE public.get_user_role()
      -- Owner & Office: Can update anything
      WHEN 'owner' THEN true
      WHEN 'office' THEN true
      
      -- Sales: Can only update their own leads/quotes
      WHEN 'sales' THEN (
        created_by = auth.uid() AND
        status IN ('lead', 'quoted', 'sent', 'accepted', 'archived')
      )
      
      -- Technician: Can update jobs assigned to them (status, completion)
      WHEN 'technician' THEN (
        assigned_to = auth.uid() AND
        status IN ('scheduled', 'in_progress', 'completed')
      )
      
      ELSE false
    END
  );

-- DELETE Policy: Only owner can delete
CREATE POLICY work_items_delete_policy ON work_items
  FOR DELETE
  USING (
    company_id = public.get_user_company_id() AND
    public.can_delete()
  );

-- ============================================
-- STEP 5: Update quote_items RLS (line items)
-- ============================================

DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;

-- SELECT: Can see line items if can see parent work item
CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND (
        CASE public.get_user_role()
          WHEN 'owner' THEN w.company_id = public.get_user_company_id()
          WHEN 'office' THEN w.company_id = public.get_user_company_id()
          WHEN 'sales' THEN (
            w.company_id = public.get_user_company_id() AND
            w.created_by = auth.uid()
          )
          WHEN 'technician' THEN (
            w.company_id = public.get_user_company_id() AND
            w.assigned_to = auth.uid() AND
            w.status IN ('scheduled', 'in_progress', 'completed')
          )
          ELSE false
        END
      )
    )
  );

-- INSERT: Can add line items if can update parent work item
CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
      AND (
        public.get_user_role() IN ('owner', 'office') OR
        (public.get_user_role() = 'sales' AND w.created_by = auth.uid())
      )
    )
  );

-- UPDATE: Same as insert
CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
      AND (
        public.get_user_role() IN ('owner', 'office') OR
        (public.get_user_role() = 'sales' AND w.created_by = auth.uid())
      )
    )
  );

-- DELETE: Only owner can delete
CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM work_items w
      WHERE w.id = quote_items.work_item_id
      AND w.company_id = public.get_user_company_id()
      AND public.can_delete()
    )
  );

-- ============================================
-- STEP 6: catalog_items RLS (Pricing)
-- ============================================

DROP POLICY IF EXISTS catalog_items_select_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_insert_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_update_policy ON catalog_items;
DROP POLICY IF EXISTS catalog_items_delete_policy ON catalog_items;

-- SELECT: Owner and Office can see catalog, Sales/Technician cannot
CREATE POLICY catalog_items_select_policy ON catalog_items
  FOR SELECT
  USING (
    company_id = public.get_user_company_id() AND
    public.is_owner_or_office()
  );

-- INSERT/UPDATE/DELETE: Owner only
CREATE POLICY catalog_items_insert_policy ON catalog_items
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id() AND
    public.can_manage_settings()
  );

CREATE POLICY catalog_items_update_policy ON catalog_items
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id() AND
    public.can_manage_settings()
  );

CREATE POLICY catalog_items_delete_policy ON catalog_items
  FOR DELETE
  USING (
    company_id = public.get_user_company_id() AND
    public.can_delete()
  );

-- ============================================
-- STEP 7: companies RLS (Settings)
-- ============================================

DROP POLICY IF EXISTS companies_update_policy ON companies;

CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  USING (
    id = public.get_user_company_id() AND
    public.can_manage_settings()
  );

-- ============================================
-- STEP 8: team_members RLS (Team Management)
-- ============================================

DROP POLICY IF EXISTS team_members_select_policy ON team_members;
DROP POLICY IF EXISTS team_members_insert_policy ON team_members;
DROP POLICY IF EXISTS team_members_update_policy ON team_members;
DROP POLICY IF EXISTS team_members_delete_policy ON team_members;

-- SELECT: Everyone in company can see team members
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- INSERT: Only owner can invite
CREATE POLICY team_members_insert_policy ON team_members
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id() AND
    public.get_user_role() = 'owner'
  );

-- UPDATE: Only owner can change roles
CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id() AND
    public.get_user_role() = 'owner'
  );

-- DELETE: Only owner can remove team members
CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  USING (
    company_id = public.get_user_company_id() AND
    public.can_delete()
  );

-- ============================================
-- STEP 9: Add comments for documentation
-- ============================================

COMMENT ON TYPE user_role IS 'User roles: owner (full access), office (operations), sales (own leads/quotes), technician (assigned jobs)';

-- ============================================
-- DONE: Role-Based Permission System Active
-- ============================================
