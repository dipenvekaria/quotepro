-- Fix team_members RLS - allow users to see their company's team
-- Drop any existing policies first
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- SELECT: Users can see all team members in their company
CREATE POLICY "team_members_select_policy" ON team_members
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- INSERT: Only owners can add team members
CREATE POLICY "team_members_insert_policy" ON team_members
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- UPDATE: Only owners can update team members (change roles, etc)
CREATE POLICY "team_members_update_policy" ON team_members
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );

-- DELETE: Only owners can remove team members
CREATE POLICY "team_members_delete_policy" ON team_members
  FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND public.get_user_role() = 'owner'
  );
