-- ============================================
-- MIGRATE TO NEW SCHEMA (_NEW TABLES ONLY)
-- ============================================
-- This script:
-- 1. Drops all OLD tables (companies, quotes, quote_items, etc.)
-- 2. Renames _NEW tables to remove the suffix
-- 3. App will use the new normalized schema going forward
-- ============================================

-- STEP 1: Drop all OLD tables
DROP TABLE IF EXISTS quote_audit_log CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS pricing_items CASCADE;
DROP TABLE IF EXISTS signed_documents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- STEP 2: Rename _NEW tables to remove suffix
ALTER TABLE companies_new RENAME TO companies;
ALTER TABLE users_new RENAME TO users;
ALTER TABLE customers_new RENAME TO customers;
-- customer_addresses stays as-is (no old version)
ALTER TABLE leads_new RENAME TO leads;
ALTER TABLE quotes_new RENAME TO quotes;
ALTER TABLE quote_items_new RENAME TO quote_items;
-- quote_options stays as-is (no old version)
ALTER TABLE jobs_new RENAME TO jobs;
ALTER TABLE invoices_new RENAME TO invoices;
-- payments, catalog_items, ai_conversations, document_embeddings, activity_log, ai_prompts stay as-is

-- STEP 3: Rename constraints and indexes to remove _new suffix
-- (Automatically handled by Postgres when renaming tables)

-- STEP 4: Verify new structure
SELECT 'Migration complete! New tables:' as message;
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE '%_new%'
ORDER BY tablename;
