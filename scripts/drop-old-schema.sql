-- ============================================
-- DROP ALL OLD TABLES - COMPLETE CLEANUP
-- ============================================
-- This removes the OLD monolithic schema entirely
-- Run this BEFORE migrating to new schema
-- ============================================

-- Drop old tables in reverse dependency order
DROP TABLE IF EXISTS quote_audit_log CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS signed_documents CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS pricing_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Verify cleanup
SELECT 'Old tables dropped. Remaining tables:' as message;
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
