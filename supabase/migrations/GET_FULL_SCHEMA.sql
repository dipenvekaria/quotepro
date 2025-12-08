-- ============================================
-- GET FULL SCHEMA - Discover actual database structure
-- ============================================

-- 1. Companies table schema
SELECT 
  'COMPANIES TABLE' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- 2. Team_members table schema
SELECT 
  'TEAM_MEMBERS TABLE' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'team_members'
ORDER BY ordinal_position;

-- 3. Sample data from companies
SELECT 'COMPANIES DATA' as info, * FROM companies LIMIT 3;

-- 4. Sample data from team_members
SELECT 'TEAM_MEMBERS DATA' as info, * FROM team_members LIMIT 3;

-- 5. Your auth user ID
SELECT 'YOUR USER ID' as info, auth.uid()::text as value;

-- 6. Your team_member record
SELECT 'YOUR TEAM_MEMBER RECORD' as info, * 
FROM team_members 
WHERE user_id = auth.uid();

-- 7. Check if user_role enum exists
SELECT 
  'USER_ROLE ENUM VALUES' as info,
  enumlabel as role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY enumsortorder;

-- 8. Current RLS policies on work_items
SELECT 
  'WORK_ITEMS RLS POLICIES' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'work_items'
ORDER BY policyname;
