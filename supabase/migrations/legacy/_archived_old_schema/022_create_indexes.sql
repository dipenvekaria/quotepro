-- ============================================
-- MIGRATION 022: Create Performance Indexes
-- ============================================
-- Purpose: Add strategic indexes for fast query performance
-- Created: 2024-11-30
-- Phase: 1 - Database Schema Redesign
-- Risk: LOW (indexes only, improves performance)
-- ============================================
--
-- This migration creates 35+ indexes for:
-- - Foreign key lookups (company_id, customer_id, etc.)
-- - Common query patterns (status, dates, search)
-- - Vector similarity search (document_embeddings)
-- - Composite indexes for complex queries
--
-- Index naming convention: idx_<table>_<column(s)>
-- ============================================

-- ============================================
-- ENABLE EXTENSIONS FIRST
-- ============================================
-- Enable pg_trgm for full-text search (MUST be before using gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS 'Trigram similarity search for fast text matching';

-- ============================================
-- COMPANIES_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_companies_new_name ON companies_new(name);

-- ============================================
-- USERS_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_new_company_id ON users_new(company_id);
CREATE INDEX IF NOT EXISTS idx_users_new_role ON users_new(role);
CREATE INDEX IF NOT EXISTS idx_users_new_is_active ON users_new(is_active);

-- ============================================
-- CUSTOMERS_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customers_new_company_id ON customers_new(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_new_email ON customers_new(email);
CREATE INDEX IF NOT EXISTS idx_customers_new_phone ON customers_new(phone);
CREATE INDEX IF NOT EXISTS idx_customers_new_name ON customers_new(name);
CREATE INDEX IF NOT EXISTS idx_customers_new_created_at ON customers_new(created_at DESC);

-- For full-text search on customer names
CREATE INDEX IF NOT EXISTS idx_customers_new_name_trgm ON customers_new USING gin(name gin_trgm_ops);

-- ============================================
-- CUSTOMER_ADDRESSES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_is_primary ON customer_addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_zip ON customer_addresses(zip);

-- ============================================
-- LEADS_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_new_company_id ON leads_new(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_new_customer_id ON leads_new(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_new_status ON leads_new(status);
CREATE INDEX IF NOT EXISTS idx_leads_new_assigned_to ON leads_new(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_new_created_at ON leads_new(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_new_scheduled_visit_at ON leads_new(scheduled_visit_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_new_company_status ON leads_new(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_new_company_assigned ON leads_new(company_id, assigned_to, status);

-- ============================================
-- QUOTES_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quotes_new_company_id ON quotes_new(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_new_customer_id ON quotes_new(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_new_lead_id ON quotes_new(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_new_status ON quotes_new(status);
CREATE INDEX IF NOT EXISTS idx_quotes_new_created_by ON quotes_new(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_new_created_at ON quotes_new(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_new_sent_at ON quotes_new(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_new_quote_number ON quotes_new(quote_number);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quotes_new_company_status ON quotes_new(company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_new_company_created ON quotes_new(company_id, created_at DESC);

-- ============================================
-- QUOTE_ITEMS_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quote_items_new_quote_id ON quote_items_new(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_new_sort_order ON quote_items_new(quote_id, sort_order);

-- ============================================
-- QUOTE_OPTIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_quote_options_quote_id ON quote_options(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_options_tier ON quote_options(tier);
CREATE INDEX IF NOT EXISTS idx_quote_options_is_selected ON quote_options(is_selected);

-- ============================================
-- JOBS_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_jobs_new_company_id ON jobs_new(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_new_quote_id ON jobs_new(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_new_customer_id ON jobs_new(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_new_status ON jobs_new(status);
CREATE INDEX IF NOT EXISTS idx_jobs_new_scheduled_start ON jobs_new(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_jobs_new_scheduled_end ON jobs_new(scheduled_end);
CREATE INDEX IF NOT EXISTS idx_jobs_new_job_number ON jobs_new(job_number);

-- Composite indexes for calendar/schedule views
CREATE INDEX IF NOT EXISTS idx_jobs_new_company_schedule ON jobs_new(company_id, scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_jobs_new_company_status ON jobs_new(company_id, status);

-- GIN index for array searches (assigned_to)
CREATE INDEX IF NOT EXISTS idx_jobs_new_assigned_to ON jobs_new USING gin(assigned_to);

-- ============================================
-- INVOICES_NEW
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_new_company_id ON invoices_new(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_new_job_id ON invoices_new(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_new_customer_id ON invoices_new(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_new_status ON invoices_new(status);
CREATE INDEX IF NOT EXISTS idx_invoices_new_due_date ON invoices_new(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_new_created_at ON invoices_new(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_new_invoice_number ON invoices_new(invoice_number);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_new_company_status ON invoices_new(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_new_company_due ON invoices_new(company_id, due_date);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);

-- ============================================
-- CATALOG_ITEMS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_catalog_items_company_id ON catalog_items(company_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_subcategory ON catalog_items(subcategory);
CREATE INDEX IF NOT EXISTS idx_catalog_items_is_active ON catalog_items(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON catalog_items(name);

-- Composite index for active items by company
CREATE INDEX IF NOT EXISTS idx_catalog_items_company_active ON catalog_items(company_id, is_active);

-- Full-text search on catalog items
CREATE INDEX IF NOT EXISTS idx_catalog_items_name_trgm ON catalog_items USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catalog_items_description_trgm ON catalog_items USING gin(description gin_trgm_ops);

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_catalog_items_tags ON catalog_items USING gin(tags);

-- ============================================
-- AI_CONVERSATIONS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company_id ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_entity_type ON ai_conversations(entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_entity_id ON ai_conversations(entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- Composite index for analytics
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company_created ON ai_conversations(company_id, created_at DESC);

-- ============================================
-- DOCUMENT_EMBEDDINGS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_document_embeddings_company_id ON document_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_type ON document_embeddings(document_type);

-- CRITICAL: Vector similarity search index (HNSW algorithm)
-- This enables fast cosine similarity search for RAG
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (use if HNSW not available)
-- CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector ON document_embeddings 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Composite index for filtered vector search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_company_type ON document_embeddings(company_id, document_type);

-- ============================================
-- ACTIVITY_LOG
-- ============================================
CREATE INDEX IF NOT EXISTS idx_activity_log_company_id ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Composite indexes for audit trail queries
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created ON activity_log(company_id, created_at DESC);

-- ============================================
-- AI_PROMPTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_prompts_company_id ON ai_prompts(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_prompt_type ON ai_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_is_active ON ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_is_default ON ai_prompts(is_default);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Count indexes on new tables
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND (tablename LIKE '%_new' OR tablename IN (
    'customer_addresses', 'quote_options', 'payments', 'catalog_items', 
    'ai_conversations', 'document_embeddings', 'activity_log', 'ai_prompts'
  ))
  AND indexname LIKE 'idx_%';
  
  RAISE NOTICE '✅ Created % strategic indexes', index_count;
  RAISE NOTICE '✅ Vector search enabled with HNSW index';
  RAISE NOTICE '✅ Full-text search enabled with pg_trgm';
END $$;

-- List all indexes grouped by table
SELECT 
  tablename,
  COUNT(*) as index_count,
  array_agg(indexname ORDER BY indexname) as indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (tablename LIKE '%_new' OR tablename IN (
  'customer_addresses', 'quote_options', 'payments', 'catalog_items', 
  'ai_conversations', 'document_embeddings', 'activity_log', 'ai_prompts'
))
AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- NOTES
-- ============================================
-- 
-- ✅ 75+ indexes created (including primary keys and unique constraints)
-- ✅ Vector index using HNSW algorithm (best for similarity search)
-- ✅ GIN indexes for arrays (jobs.assigned_to, catalog_items.tags)
-- ✅ Trigram indexes for fuzzy text search
-- ✅ Composite indexes for common query patterns
-- ✅ Descending indexes for recent-first queries
--
-- Performance considerations:
-- - Indexes improve SELECT performance but slow down INSERT/UPDATE
-- - HNSW vector index provides ~10x faster similarity search vs sequential scan
-- - pg_trgm enables fuzzy search like "ILIKE '%term%'" efficiently
-- - Composite indexes avoid index scans on multiple columns
--
-- Next steps:
-- 1. Migration 023: Add RLS policies for security
-- 2. Migration 024: Create convenience views
-- 3. Migration 025: Seed test data
--
-- ============================================
