-- ============================================================
-- QUOTEPRO SCHEMA CLEANUP - REMOVE DEPRECATED TABLES
-- ============================================================
-- BEFORE RUNNING: Backup your database!
-- IMPACT: Drops old tables (leads, quotes, jobs, invoices) and recreates views
-- SAFE: No current code uses these tables (all migrated to work_items)
-- ============================================================

-- ANALYSIS SUMMARY:
-- ✅ work_items table exists and is actively used (31 FKs point to it)
-- ❌ OLD tables still exist: leads, quotes, jobs, invoices
-- ❌ 6 views reference OLD tables instead of work_items
-- ❌ quote_options table references old quotes table (unused in code)
-- ❌ useLeadsQueue.ts still references 'leads' table (needs code fix)
-- ❌ 3 files still reference 'quotes' table (needs code fix)

-- ============================================================
-- STEP 1: DROP OLD FOREIGN KEY CONSTRAINTS
-- ============================================================

-- invoices → jobs (will drop entire invoices table)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_new_job_id_fkey;

-- jobs → quotes (will drop entire jobs table)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_new_quote_id_fkey;

-- quotes → leads (will drop entire quotes table)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_new_lead_id_fkey;

-- quote_options → quotes (will drop quote_options entirely)
ALTER TABLE quote_options DROP CONSTRAINT IF EXISTS quote_options_quote_id_fkey;

-- ============================================================
-- STEP 2: DROP DEPRECATED VIEWS (will recreate later)
-- ============================================================

DROP VIEW IF EXISTS activity_feed_view;
DROP VIEW IF EXISTS customer_overview_view;
DROP VIEW IF EXISTS invoice_summary_view;
DROP VIEW IF EXISTS job_schedule_view;
DROP VIEW IF EXISTS quote_details_view;
-- Keep ai_analytics_summary (doesn't use old tables)

-- ============================================================
-- STEP 3: DROP OLD TABLES
-- ============================================================

-- Drop in dependency order (child → parent)
DROP TABLE IF EXISTS payments CASCADE;        -- references invoices
DROP TABLE IF EXISTS invoices CASCADE;        -- references jobs
DROP TABLE IF EXISTS jobs CASCADE;            -- references quotes
DROP TABLE IF EXISTS quote_options CASCADE;   -- references quotes
DROP TABLE IF EXISTS quotes CASCADE;          -- references leads
DROP TABLE IF EXISTS leads CASCADE;           -- parent table

-- ============================================================
-- STEP 4: RECREATE VIEWS USING work_items
-- ============================================================

-- View 1: Activity Feed (unified with work_items)
CREATE OR REPLACE VIEW activity_feed_view AS
SELECT 
  a.id,
  a.company_id,
  a.entity_type,
  a.entity_id,
  a.action,
  a.description,
  a.changes,
  a.metadata,
  a.created_at,
  (u.profile ->> 'first_name') AS user_first_name,
  (u.profile ->> 'last_name') AS user_last_name,
  (u.profile ->> 'avatar_url') AS user_avatar_url,
  CASE a.entity_type
    WHEN 'lead' THEN (SELECT w.description FROM work_items w WHERE w.id = a.entity_id AND w.status = 'lead')
    WHEN 'quote' THEN (SELECT w.quote_number FROM work_items w WHERE w.id = a.entity_id)
    WHEN 'job' THEN (SELECT w.quote_number FROM work_items w WHERE w.id = a.entity_id AND w.status IN ('scheduled', 'in_progress', 'completed'))
    WHEN 'customer' THEN (SELECT c.name FROM customers c WHERE c.id = a.entity_id)
    ELSE NULL
  END AS entity_identifier
FROM activity_log a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;

-- View 2: Customer Overview (using work_items for leads/quotes/jobs)
CREATE OR REPLACE VIEW customer_overview_view AS
SELECT 
  c.id,
  c.company_id,
  c.name,
  c.email,
  c.phone,
  c.metadata,
  c.created_at,
  c.updated_at,
  
  -- Primary address
  (SELECT json_build_object(
    'address', ca.address,
    'city', ca.city,
    'state', ca.state,
    'zip', ca.zip,
    'label', ca.label
  )
  FROM customer_addresses ca
  WHERE ca.customer_id = c.id AND ca.is_primary = true
  LIMIT 1) AS primary_address,
  
  -- Address count
  (SELECT count(*) FROM customer_addresses ca WHERE ca.customer_id = c.id) AS address_count,
  
  -- Lead stats (work_items with status = 'lead')
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status = 'lead') AS total_leads,
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status = 'accepted') AS won_leads,
  
  -- Quote stats (work_items with status IN 'draft', 'sent', 'accepted')
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status IN ('draft', 'sent', 'accepted')) AS total_quotes,
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status = 'accepted') AS accepted_quotes,
  (SELECT COALESCE(sum(w.total), 0) FROM work_items w WHERE w.customer_id = c.id AND w.status = 'accepted') AS total_quote_value,
  
  -- Job stats (work_items with status IN 'scheduled', 'in_progress', 'completed')
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status IN ('scheduled', 'in_progress', 'completed')) AS total_jobs,
  (SELECT count(*) FROM work_items w WHERE w.customer_id = c.id AND w.status = 'completed') AS completed_jobs,
  
  -- Invoice stats (NOTE: invoices table dropped, these will be 0)
  0::numeric AS total_invoiced,
  0::numeric AS total_paid,
  
  -- Last activity
  (SELECT max(w.sent_at) FROM work_items w WHERE w.customer_id = c.id) AS last_quote_sent,
  (SELECT max(w.scheduled_at) FROM work_items w WHERE w.customer_id = c.id) AS last_job_date
  
FROM customers c;

-- View 3: Quote Details (using work_items)
CREATE OR REPLACE VIEW quote_details_view AS
SELECT 
  w.id,
  w.company_id,
  w.quote_number,
  w.job_name,
  w.description,
  w.status,
  w.subtotal,
  w.discount_amount,
  w.tax_rate,
  w.tax_amount,
  w.total,
  w.notes,
  w.sent_at,
  w.viewed_at,
  w.accepted_at,
  w.rejected_at,
  w.expires_at,
  w.pdf_url,
  w.signed_document_url,
  w.created_at,
  w.updated_at,
  
  -- Customer info
  c.name AS customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  
  -- Lead info (same work_item if status was 'lead')
  w.id AS lead_id,
  w.lead_source AS lead_source,
  
  -- Created by
  (u.profile ->> 'first_name') AS created_by_first_name,
  (u.profile ->> 'last_name') AS created_by_last_name,
  
  -- Quote items
  (SELECT json_agg(
    json_build_object(
      'id', qi.id,
      'name', qi.name,
      'description', qi.description,
      'quantity', qi.quantity,
      'unit_price', qi.unit_price,
      'total', qi.total,
      'option_tier', qi.option_tier,
      'sort_order', qi.sort_order
    ) ORDER BY qi.sort_order
  ) FROM quote_items qi WHERE qi.quote_id = w.id) AS items,
  
  (SELECT count(*) FROM quote_items qi WHERE qi.quote_id = w.id) AS item_count
  
FROM work_items w
LEFT JOIN customers c ON w.customer_id = c.id
LEFT JOIN users u ON w.created_by = u.id
WHERE w.status NOT IN ('lead');  -- Only show actual quotes, not leads

-- NOTE: invoice_summary_view and job_schedule_view NOT recreated
-- Reason: invoices and jobs tables dropped, features not in current codebase

-- ============================================================
-- STEP 5: VERIFY CLEANUP
-- ============================================================

-- Check remaining tables (should NOT include leads, quotes, jobs, invoices)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'quotes', 'jobs', 'invoices', 'payments', 'quote_options')
ORDER BY tablename;
-- Expected: 0 rows

-- Check work_items is still healthy
SELECT count(*) as work_items_count FROM work_items;

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: activity_feed_view, ai_analytics_summary, customer_overview_view, quote_details_view

-- ============================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================

-- If something breaks, restore from backup:
-- 1. Drop new views: DROP VIEW activity_feed_view, customer_overview_view, quote_details_view;
-- 2. Restore backup
-- 3. Fix code references first before retrying
