-- ============================================
-- MIGRATION 024: Create Convenience Views
-- ============================================
-- Purpose: Helpful views for common queries
-- Created: 2024-11-30
-- Phase: 1 - Database Schema Redesign
-- Risk: LOW (views only, no data modification)
-- ============================================
--
-- This migration creates 5 convenience views:
-- 1. quote_details_view - Full quote with items and customer
-- 2. job_schedule_view - Calendar view with customer info
-- 3. invoice_summary_view - Invoice with payment status
-- 4. customer_overview_view - Customer with stats
-- 5. activity_feed_view - Recent activity with user names
--
-- Views simplify complex joins and are helpful for:
-- - Frontend data fetching
-- - Reporting and analytics
-- - API endpoints
-- ============================================

-- ============================================
-- VIEW 1: QUOTE_DETAILS_VIEW
-- ============================================
-- Complete quote information with items, customer, and creator

CREATE OR REPLACE VIEW quote_details_view AS
SELECT 
  q.id,
  q.company_id,
  q.quote_number,
  q.job_name,
  q.description,
  q.status,
  q.subtotal,
  q.discount_amount,
  q.tax_rate,
  q.tax_amount,
  q.total,
  q.notes,
  q.sent_at,
  q.viewed_at,
  q.accepted_at,
  q.rejected_at,
  q.expires_at,
  q.pdf_url,
  q.signed_document_url,
  q.created_at,
  q.updated_at,
  
  -- Customer info
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  
  -- Lead info
  l.id as lead_id,
  l.source as lead_source,
  
  -- Creator info
  (u.profile->>'first_name')::text as created_by_first_name,
  (u.profile->>'last_name')::text as created_by_last_name,
  
  -- Aggregated items
  (
    SELECT json_agg(
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
    )
    FROM quote_items_new qi
    WHERE qi.quote_id = q.id
  ) as items,
  
  -- Count of items
  (
    SELECT COUNT(*)
    FROM quote_items_new qi
    WHERE qi.quote_id = q.id
  ) as item_count

FROM quotes_new q
LEFT JOIN customers_new c ON q.customer_id = c.id
LEFT JOIN leads_new l ON q.lead_id = l.id
LEFT JOIN users_new u ON q.created_by = u.id;

COMMENT ON VIEW quote_details_view IS 'Complete quote details with customer, items, and creator info';

-- ============================================
-- VIEW 2: JOB_SCHEDULE_VIEW
-- ============================================
-- Calendar-friendly view of scheduled jobs

CREATE OR REPLACE VIEW job_schedule_view AS
SELECT 
  j.id,
  j.company_id,
  j.job_number,
  j.title,
  j.description,
  j.status,
  j.scheduled_start,
  j.scheduled_end,
  j.actual_start,
  j.actual_end,
  j.assigned_to,
  j.created_at,
  
  -- Customer info
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  
  -- Quote info
  q.quote_number,
  q.total as quote_total,
  
  -- Duration calculations
  EXTRACT(EPOCH FROM (j.scheduled_end - j.scheduled_start)) / 3600 as scheduled_duration_hours,
  EXTRACT(EPOCH FROM (j.actual_end - j.actual_start)) / 3600 as actual_duration_hours,
  
  -- Team member names (array of names from assigned_to UUIDs)
  (
    SELECT array_agg((u.profile->>'first_name')::text || ' ' || (u.profile->>'last_name')::text)
    FROM users_new u
    WHERE u.id = ANY(j.assigned_to)
  ) as assigned_names,
  
  -- Team member count
  array_length(j.assigned_to, 1) as team_size

FROM jobs_new j
LEFT JOIN customers_new c ON j.customer_id = c.id
LEFT JOIN quotes_new q ON j.quote_id = q.id;

COMMENT ON VIEW job_schedule_view IS 'Calendar view of jobs with customer and team info';

-- ============================================
-- VIEW 3: INVOICE_SUMMARY_VIEW
-- ============================================
-- Invoice with payment status and customer info

CREATE OR REPLACE VIEW invoice_summary_view AS
SELECT 
  i.id,
  i.company_id,
  i.invoice_number,
  i.amount_due,
  i.amount_paid,
  i.status,
  i.due_date,
  i.sent_at,
  i.paid_at,
  i.payment_method,
  i.payment_link_url,
  i.pdf_url,
  i.created_at,
  
  -- Customer info
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  
  -- Job info
  j.job_number,
  j.title as job_title,
  
  -- Payment calculations
  i.amount_due - i.amount_paid as amount_remaining,
  ROUND((i.amount_paid / NULLIF(i.amount_due, 0) * 100)::numeric, 2) as percent_paid,
  
  -- Payment count
  (
    SELECT COUNT(*)
    FROM payments p
    WHERE p.invoice_id = i.id
  ) as payment_count,
  
  -- Days overdue (if applicable)
  CASE 
    WHEN i.status = 'overdue' AND i.due_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (NOW() - i.due_date::timestamp))::integer
    ELSE NULL
  END as days_overdue,
  
  -- Recent payments
  (
    SELECT json_agg(
      json_build_object(
        'id', p.id,
        'amount', p.amount,
        'method', p.method,
        'paid_at', p.paid_at,
        'reference_number', p.reference_number
      ) ORDER BY p.paid_at DESC
    )
    FROM payments p
    WHERE p.invoice_id = i.id
  ) as payments

FROM invoices_new i
LEFT JOIN customers_new c ON i.customer_id = c.id
LEFT JOIN jobs_new j ON i.job_id = j.id;

COMMENT ON VIEW invoice_summary_view IS 'Invoice summary with payment status and history';

-- ============================================
-- VIEW 4: CUSTOMER_OVERVIEW_VIEW
-- ============================================
-- Customer with aggregated stats and recent activity

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
  (
    SELECT json_build_object(
      'address', ca.address,
      'city', ca.city,
      'state', ca.state,
      'zip', ca.zip,
      'label', ca.label
    )
    FROM customer_addresses ca
    WHERE ca.customer_id = c.id AND ca.is_primary = true
    LIMIT 1
  ) as primary_address,
  
  -- Address count
  (
    SELECT COUNT(*)
    FROM customer_addresses ca
    WHERE ca.customer_id = c.id
  ) as address_count,
  
  -- Lead stats
  (
    SELECT COUNT(*)
    FROM leads_new l
    WHERE l.customer_id = c.id
  ) as total_leads,
  
  (
    SELECT COUNT(*)
    FROM leads_new l
    WHERE l.customer_id = c.id AND l.status = 'won'
  ) as won_leads,
  
  -- Quote stats
  (
    SELECT COUNT(*)
    FROM quotes_new q
    WHERE q.customer_id = c.id
  ) as total_quotes,
  
  (
    SELECT COUNT(*)
    FROM quotes_new q
    WHERE q.customer_id = c.id AND q.status = 'accepted'
  ) as accepted_quotes,
  
  (
    SELECT COALESCE(SUM(q.total), 0)
    FROM quotes_new q
    WHERE q.customer_id = c.id AND q.status = 'accepted'
  ) as total_quote_value,
  
  -- Job stats
  (
    SELECT COUNT(*)
    FROM jobs_new j
    WHERE j.customer_id = c.id
  ) as total_jobs,
  
  (
    SELECT COUNT(*)
    FROM jobs_new j
    WHERE j.customer_id = c.id AND j.status = 'completed'
  ) as completed_jobs,
  
  -- Invoice stats
  (
    SELECT COALESCE(SUM(i.amount_due), 0)
    FROM invoices_new i
    WHERE i.customer_id = c.id
  ) as total_invoiced,
  
  (
    SELECT COALESCE(SUM(i.amount_paid), 0)
    FROM invoices_new i
    WHERE i.customer_id = c.id
  ) as total_paid,
  
  -- Last contact
  (
    SELECT MAX(q.sent_at)
    FROM quotes_new q
    WHERE q.customer_id = c.id
  ) as last_quote_sent,
  
  (
    SELECT MAX(j.scheduled_start)
    FROM jobs_new j
    WHERE j.customer_id = c.id
  ) as last_job_date

FROM customers_new c;

COMMENT ON VIEW customer_overview_view IS 'Customer with aggregated stats and activity';

-- ============================================
-- VIEW 5: ACTIVITY_FEED_VIEW
-- ============================================
-- Recent activity with user and entity details

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
  
  -- User info
  (u.profile->>'first_name')::text as user_first_name,
  (u.profile->>'last_name')::text as user_last_name,
  (u.profile->>'avatar_url')::text as user_avatar_url,
  
  -- Entity details (polymorphic)
  CASE a.entity_type
    WHEN 'lead' THEN (SELECT l.description FROM leads_new l WHERE l.id = a.entity_id)
    WHEN 'quote' THEN (SELECT q.quote_number FROM quotes_new q WHERE q.id = a.entity_id)
    WHEN 'job' THEN (SELECT j.job_number FROM jobs_new j WHERE j.id = a.entity_id)
    WHEN 'invoice' THEN (SELECT i.invoice_number FROM invoices_new i WHERE i.id = a.entity_id)
    WHEN 'customer' THEN (SELECT c.name FROM customers_new c WHERE c.id = a.entity_id)
  END as entity_identifier

FROM activity_log a
LEFT JOIN users_new u ON a.user_id = u.id
ORDER BY a.created_at DESC;

COMMENT ON VIEW activity_feed_view IS 'Activity feed with user and entity details';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  view_count INTEGER;
BEGIN
  -- Count views created
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name LIKE '%_view';
  
  RAISE NOTICE '✅ Created % convenience views', view_count;
  RAISE NOTICE '✅ Views ready for frontend queries';
END $$;

-- List all views
SELECT 
  table_name as view_name,
  view_definition as definition_preview
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'quote_details_view',
  'job_schedule_view',
  'invoice_summary_view',
  'customer_overview_view',
  'activity_feed_view'
)
ORDER BY table_name;

-- ============================================
-- NOTES
-- ============================================
-- 
-- ✅ 5 convenience views created
-- ✅ Complex joins pre-computed
-- ✅ JSON aggregations for related data
-- ✅ Calculated fields (duration, percent_paid, etc)
-- ✅ Stats aggregations (counts, sums)
--
-- Usage examples:
-- - SELECT * FROM quote_details_view WHERE company_id = :company_id AND status = 'sent';
-- - SELECT * FROM job_schedule_view WHERE scheduled_start >= :date ORDER BY scheduled_start;
-- - SELECT * FROM invoice_summary_view WHERE status = 'overdue';
-- - SELECT * FROM customer_overview_view WHERE total_quote_value > 10000;
-- - SELECT * FROM activity_feed_view WHERE company_id = :company_id LIMIT 50;
--
-- Next steps:
-- 1. Migration 025: Seed test data
--
-- ============================================
