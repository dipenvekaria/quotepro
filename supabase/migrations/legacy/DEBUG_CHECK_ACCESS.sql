-- ============================================
-- DEBUG: Check Your Access and Role Status
-- Run this to see what's blocking you
-- ============================================

-- 1. Check your user ID
SELECT auth.uid() as my_user_id;

-- 2. Check companies table structure first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies';

-- 3. Check your company records
SELECT *
FROM companies
LIMIT 5;

-- 4. Check if get_user_company_id() function exists and works
SELECT public.get_user_company_id() as my_company_id;

-- 5. Check if get_user_role() function exists
SELECT public.get_user_role() as my_role;

-- 6. Check if you have any team_member record
SELECT *
FROM team_members
LIMIT 5;

-- 7. Check what work_items you can see
SELECT COUNT(*) as work_items_count
FROM work_items;

-- 8. Try to see work_items directly (bypass RLS check)
SELECT id, status, job_name, company_id
FROM work_items
LIMIT 5;

-- 9. Check RLS policies on work_items
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'work_items'
ORDER BY policyname;

-- ============================================
-- If you see 0 work_items, RLS is still blocking you
-- ============================================
