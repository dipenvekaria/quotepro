-- ============================================================
-- QUOTEPRO SCHEMA AUDIT - Run these queries in Supabase SQL Editor
-- Copy/paste output back to Copilot for analysis
-- ============================================================

-- QUERY 1: List all tables (excluding system tables)
-- Copy this output first
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================

-- QUERY 2: Get detailed schema for each table
-- Copy this output second
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  tc.constraint_type,
  kcu.constraint_name
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
LEFT JOIN information_schema.key_column_usage kcu
  ON c.table_name = kcu.table_name
  AND c.column_name = kcu.column_name
  AND c.table_schema = kcu.table_schema
LEFT JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema = tc.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================

-- QUERY 3: List all foreign key relationships
-- Copy this output third
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================

-- QUERY 4: Show RLS policies on all tables
-- Copy this output fourth
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================

-- QUERY 5: Check for any views (might be using old table names)
-- Copy this output fifth
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
