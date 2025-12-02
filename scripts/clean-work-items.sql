-- Clean all work items (quotes, leads, audit logs, quote items, etc.)
-- Keeps: companies, user accounts

-- Disable RLS temporarily for bulk deletion
SET session_replication_role = replica;

-- 1. Delete quote audit logs (depends on quotes)
DELETE FROM quote_audit_log;

-- 2. Delete quote items (depends on quotes)
DELETE FROM quote_items;

-- 3. Delete quotes (main work items table)
DELETE FROM quotes;

-- 4. Reset auto-increment counters
ALTER SEQUENCE IF EXISTS quote_audit_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS quote_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS quotes_id_seq RESTART WITH 1;

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Verify cleanup
SELECT 'Quotes remaining:' as table_name, COUNT(*) as count FROM quotes
UNION ALL
SELECT 'Quote items remaining:', COUNT(*) FROM quote_items
UNION ALL
SELECT 'Audit logs remaining:', COUNT(*) FROM quote_audit_log
UNION ALL
SELECT 'Companies remaining (should be preserved):', COUNT(*) FROM companies;
