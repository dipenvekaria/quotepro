-- Clean all work items (leads, quotes, jobs, invoices, etc.)
-- NEW SCHEMA VERSION - Uses normalized tables
-- Keeps: companies, users, customers, catalog_items

-- Disable RLS temporarily for bulk deletion
SET session_replication_role = replica;

-- 1. Delete payments (depends on invoices)
DELETE FROM payments;

-- 2. Delete invoices (depends on jobs)
DELETE FROM invoices;

-- 3. Delete jobs (depends on quotes)
DELETE FROM jobs;

-- 4. Delete quote options (depends on quotes)
DELETE FROM quote_options;

-- 5. Delete quote items (depends on quotes)
DELETE FROM quote_items;

-- 6. Delete quotes (depends on leads)
DELETE FROM quotes;

-- 7. Delete leads (depends on customers)
DELETE FROM leads;

-- 8. Delete customer addresses (depends on customers)
DELETE FROM customer_addresses;

-- 9. Delete activity log
DELETE FROM activity_log;

-- 10. Delete AI conversations
DELETE FROM ai_conversations;

-- 11. Reset auto-increment counters (if any exist)
ALTER SEQUENCE IF EXISTS quote_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS leads_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS quotes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS jobs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS invoices_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Verify cleanup
SELECT 'Leads remaining:' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'Quotes remaining:', COUNT(*) FROM quotes
UNION ALL
SELECT 'Jobs remaining:', COUNT(*) FROM jobs
UNION ALL
SELECT 'Invoices remaining:', COUNT(*) FROM invoices
UNION ALL
SELECT 'Quote items remaining:', COUNT(*) FROM quote_items
UNION ALL
SELECT 'Activity logs remaining:', COUNT(*) FROM activity_log
UNION ALL
SELECT 'Customers remaining (should be preserved):', COUNT(*) FROM customers
UNION ALL
SELECT 'Companies remaining (should be preserved):', COUNT(*) FROM companies
UNION ALL
SELECT 'Catalog items remaining (should be preserved):', COUNT(*) FROM catalog_items;
