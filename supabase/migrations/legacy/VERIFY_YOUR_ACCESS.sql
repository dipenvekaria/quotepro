-- ============================================
-- VERIFY YOUR ACCESS - Check if everything is set up
-- ============================================

-- 1. Check your team_members record
SELECT 'YOUR TEAM MEMBER RECORD' as check_name, *
FROM team_members
WHERE user_id = auth.uid();

-- 2. Test the helper functions
SELECT 'HELPER FUNCTIONS TEST' as check_name,
  public.get_user_company_id()::text as company_id,
  public.get_user_role() as role,
  public.is_owner_or_office() as is_owner_or_office;

-- 3. Check how many work_items you can see
SELECT 'WORK ITEMS ACCESS' as check_name, COUNT(*) as visible_count
FROM work_items;

-- 4. Check all your team_members records
SELECT 'ALL YOUR RECORDS' as check_name, id, company_id, user_id, role, created_at
FROM team_members
WHERE company_id = '1698b6b2-97f4-42b8-bc4a-83534472c822'
ORDER BY created_at DESC;
