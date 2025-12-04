-- ============================================
-- MIGRATION 021: Create New Normalized Schema
-- ============================================
-- Purpose: Create normalized database schema for QuotePro 2.0
-- Created: 2024-11-30
-- Phase: 1 - Database Schema Redesign
-- Risk: LOW (additive only, doesn't modify existing tables)
-- ============================================
--
-- This migration creates 16 new tables:
-- 1. companies_new - Multi-tenant root
-- 2. users_new - Team members
-- 3. customers_new - Deduplicated customers
-- 4. customer_addresses - Multiple addresses per customer
-- 5. leads_new - Sales pipeline
-- 6. quotes_new - Quote management
-- 7. quote_items_new - Line items
-- 8. quote_options - Good/better/best bundles
-- 9. jobs_new - Accepted quotes become jobs
-- 10. invoices_new - Billing
-- 11. payments - Payment tracking
-- 12. catalog_items - Product/service catalog
-- 13. ai_conversations - AI usage tracking
-- 14. document_embeddings - RAG vectors (uses pgvector)
-- 15. activity_log - Unified audit trail
-- 16. ai_prompts - Company-specific prompts
--
-- IMPORTANT: All tables use '_new' suffix to avoid conflicts
-- with existing schema. Old tables remain untouched.
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE 1: COMPANIES_NEW
-- ============================================
-- Multi-tenant root table
CREATE TABLE IF NOT EXISTS companies_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Settings stored as JSON for flexibility
  settings JSONB DEFAULT jsonb_build_object(
    'tax_rate', 8.5,
    'currency', 'USD',
    'timezone', 'America/Los_Angeles',
    'ai_preferences', jsonb_build_object(
      'default_model', 'gemini-2.0-flash',
      'temperature', 0.1,
      'max_tokens', 2000
    )
  ),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER companies_new_updated_at 
  BEFORE UPDATE ON companies_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE companies_new IS 'Multi-tenant companies (QuotePro 2.0 normalized schema)';

-- ============================================
-- TABLE 2: USERS_NEW
-- ============================================
-- Team members within companies
CREATE TABLE IF NOT EXISTS users_new (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL DEFAULT 'member',
  -- Roles: owner, admin, technician, sales, accountant, member
  
  profile JSONB DEFAULT jsonb_build_object(
    'first_name', null,
    'last_name', null,
    'phone', null,
    'avatar_url', null
  ),
  
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'technician', 'sales', 'accountant', 'member'))
);

COMMENT ON TABLE users_new IS 'Team members with roles (QuotePro 2.0)';

-- ============================================
-- TABLE 3: CUSTOMERS_NEW
-- ============================================
-- Deduplicated customer records
CREATE TABLE IF NOT EXISTS customers_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Metadata for custom fields, tags, etc.
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate customers (unique by phone OR email)
  CONSTRAINT unique_customer_phone UNIQUE(company_id, phone),
  CONSTRAINT unique_customer_email UNIQUE(company_id, email)
);

CREATE TRIGGER customers_new_updated_at 
  BEFORE UPDATE ON customers_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE customers_new IS 'Deduplicated customer records (QuotePro 2.0)';

-- ============================================
-- TABLE 4: CUSTOMER_ADDRESSES
-- ============================================
-- Multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  label TEXT, -- home, business, rental_property
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  
  -- Geocoding for map features (future)
  geocode JSONB, -- {lat: 37.7749, lng: -122.4194, formatted_address: "..."}
  
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE customer_addresses IS 'Multiple addresses per customer (QuotePro 2.0)';

-- ============================================
-- TABLE 5: LEADS_NEW
-- ============================================
-- Sales pipeline before quote creation
CREATE TABLE IF NOT EXISTS leads_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  source TEXT DEFAULT 'direct', 
  -- Sources: direct, phone, website, referral, google_ads, facebook, other
  
  status TEXT NOT NULL DEFAULT 'new',
  -- Status: new, contacted, qualified, quote_sent, quoted, won, lost, archived
  
  description TEXT,
  urgency TEXT DEFAULT 'medium', -- low, medium, high
  estimated_value DECIMAL(10,2),
  
  scheduled_visit_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users_new(id),
  
  lost_reason TEXT,
  archived_reason TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_lead_status CHECK (status IN (
    'new', 'contacted', 'qualified', 'quote_sent', 'quoted', 'won', 'lost', 'archived'
  )),
  CONSTRAINT valid_urgency CHECK (urgency IN ('low', 'medium', 'high'))
);

CREATE TRIGGER leads_new_updated_at 
  BEFORE UPDATE ON leads_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE leads_new IS 'Sales pipeline leads (QuotePro 2.0)';

-- ============================================
-- TABLE 6: QUOTES_NEW
-- ============================================
-- Quote management
CREATE TABLE IF NOT EXISTS quotes_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads_new(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  quote_number TEXT NOT NULL,
  
  -- Quote content
  job_name TEXT,
  description TEXT,
  
  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.5,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  notes TEXT,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft',
  -- Status: draft, sent, viewed, accepted, rejected, expired
  
  -- Tracking timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Documents
  pdf_url TEXT,
  signed_document_url TEXT,
  
  -- Metadata
  created_by UUID REFERENCES users_new(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_quote_number UNIQUE(company_id, quote_number),
  CONSTRAINT valid_quote_status CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  ))
);

CREATE TRIGGER quotes_new_updated_at 
  BEFORE UPDATE ON quotes_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE quotes_new IS 'Quote management with proper workflow (QuotePro 2.0)';

-- ============================================
-- TABLE 7: QUOTE_ITEMS_NEW
-- ============================================
-- Line items for quotes (normalized - no longer JSONB array)
CREATE TABLE IF NOT EXISTS quote_items_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  -- Optional categorization
  option_tier TEXT, -- good, better, best
  is_upsell BOOLEAN DEFAULT false,
  is_discount BOOLEAN DEFAULT false,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE quote_items_new IS 'Quote line items - normalized (QuotePro 2.0)';

-- ============================================
-- TABLE 8: QUOTE_OPTIONS
-- ============================================
-- Good/Better/Best quote options
CREATE TABLE IF NOT EXISTS quote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes_new(id) ON DELETE CASCADE,
  
  tier TEXT NOT NULL, -- good, better, best
  name TEXT NOT NULL,
  description TEXT,
  total DECIMAL(10,2) NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_tier CHECK (tier IN ('good', 'better', 'best'))
);

COMMENT ON TABLE quote_options IS 'Good/Better/Best quote options (QuotePro 2.0)';

-- ============================================
-- TABLE 9: JOBS_NEW
-- ============================================
-- Accepted quotes become scheduled jobs
CREATE TABLE IF NOT EXISTS jobs_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes_new(id),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  job_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  status TEXT NOT NULL DEFAULT 'scheduled',
  -- Status: scheduled, in_progress, completed, cancelled
  
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  
  -- Team assignment (array of user IDs)
  assigned_to UUID[] DEFAULT '{}',
  
  -- Completion data
  completion_notes TEXT,
  customer_signature JSONB, -- {signature_data, signed_at, signed_by}
  photos JSONB DEFAULT '[]', -- [{url, caption, uploaded_at}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_job_number UNIQUE(company_id, job_number),
  CONSTRAINT valid_job_status CHECK (status IN (
    'scheduled', 'in_progress', 'completed', 'cancelled'
  ))
);

CREATE TRIGGER jobs_new_updated_at 
  BEFORE UPDATE ON jobs_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE jobs_new IS 'Scheduled jobs from accepted quotes (QuotePro 2.0)';

-- ============================================
-- TABLE 10: INVOICES_NEW
-- ============================================
-- Invoices generated from completed jobs
CREATE TABLE IF NOT EXISTS invoices_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs_new(id),
  customer_id UUID NOT NULL REFERENCES customers_new(id) ON DELETE CASCADE,
  
  invoice_number TEXT NOT NULL,
  
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, sent, partial, paid, overdue, cancelled
  
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  payment_method TEXT, -- cash, check, card, bank_transfer, demo
  payment_link_url TEXT,
  
  pdf_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_invoice_number UNIQUE(company_id, invoice_number),
  CONSTRAINT valid_invoice_status CHECK (status IN (
    'pending', 'sent', 'partial', 'paid', 'overdue', 'cancelled'
  ))
);

CREATE TRIGGER invoices_new_updated_at 
  BEFORE UPDATE ON invoices_new
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE invoices_new IS 'Invoices from completed jobs (QuotePro 2.0)';

-- ============================================
-- TABLE 11: PAYMENTS
-- ============================================
-- Payment records (multiple payments per invoice)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices_new(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  method TEXT NOT NULL, -- cash, check, card, bank_transfer
  reference_number TEXT,
  notes TEXT,
  
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users_new(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Payment records - supports partial payments (QuotePro 2.0)';

-- ============================================
-- TABLE 12: CATALOG_ITEMS
-- ============================================
-- Product/service catalog with AI metadata
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  
  base_price DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'each', -- each, hour, sqft, lf
  
  is_active BOOLEAN DEFAULT true,
  
  -- AI metadata for better quote generation
  tags TEXT[] DEFAULT '{}',
  typical_quantity DECIMAL(10,2),
  labor_hours DECIMAL(5,2),
  material_cost DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER catalog_items_updated_at 
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE catalog_items IS 'Product/service catalog with AI metadata (QuotePro 2.0)';

-- ============================================
-- TABLE 13: AI_CONVERSATIONS
-- ============================================
-- Track all AI interactions for analytics
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
  
  entity_type TEXT NOT NULL, -- quote, lead, invoice, customer
  entity_id UUID NOT NULL,
  
  model TEXT NOT NULL, -- gemini-2.0-flash, gpt-4, etc.
  purpose TEXT NOT NULL, -- quote_generation, customer_query, job_scheduling
  
  messages JSONB NOT NULL, -- [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_conversations IS 'AI interaction tracking for analytics and cost monitoring (QuotePro 2.0)';

-- ============================================
-- TABLE 14: DOCUMENT_EMBEDDINGS
-- ============================================
-- Vector embeddings for RAG (uses pgvector extension)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- catalog, quote, policy, procedure, faq
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Vector embedding for semantic search (1536 dimensions for Gemini/OpenAI)
  embedding VECTOR(1536),
  
  metadata JSONB DEFAULT '{}', -- {tags, category, author, source_url}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER document_embeddings_updated_at 
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE document_embeddings IS 'Vector embeddings for RAG semantic search (QuotePro 2.0)';

-- ============================================
-- TABLE 15: ACTIVITY_LOG
-- ============================================
-- Unified audit trail for all entities
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
  
  entity_type TEXT NOT NULL, -- lead, quote, job, invoice, customer
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL, -- created, updated, sent, accepted, completed
  description TEXT,
  
  -- Before/after changes for detailed audit
  changes JSONB,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activity_log IS 'Unified audit trail for all entities (QuotePro 2.0)';

-- ============================================
-- TABLE 16: AI_PROMPTS
-- ============================================
-- Company-specific AI prompt customization
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies_new(id) ON DELETE CASCADE,
  
  prompt_type TEXT NOT NULL, -- quote_generation, job_name, email_draft
  name TEXT NOT NULL,
  system_prompt TEXT,
  user_template TEXT, -- With {{variable}} placeholders
  
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_prompt UNIQUE(company_id, prompt_type, name)
);

CREATE TRIGGER ai_prompts_updated_at 
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ai_prompts IS 'Company-specific AI prompt customization (QuotePro 2.0)';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Count new tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%_new'
  OR table_name IN ('customer_addresses', 'quote_options', 'payments', 'catalog_items', 
                     'ai_conversations', 'document_embeddings', 'activity_log', 'ai_prompts');
  
  IF table_count < 16 THEN
    RAISE EXCEPTION 'Expected 16 tables but found %', table_count;
  END IF;
  
  RAISE NOTICE '✅ Successfully created % tables', table_count;
  RAISE NOTICE '✅ QuotePro 2.0 normalized schema ready!';
END $$;

-- List all new tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND (table_name LIKE '%_new' OR table_name IN (
  'customer_addresses', 'quote_options', 'payments', 'catalog_items', 
  'ai_conversations', 'document_embeddings', 'activity_log', 'ai_prompts'
))
ORDER BY table_name;

-- ============================================
-- NOTES
-- ============================================
-- 
-- ✅ All tables created with '_new' suffix (except junction/new tables)
-- ✅ Old schema untouched - zero breaking changes
-- ✅ Proper foreign keys and constraints
-- ✅ Auto-updating timestamps on all main tables
-- ✅ JSONB for flexible metadata
-- ✅ UUID[] arrays for multi-assignment (jobs)
-- ✅ Vector column ready for RAG (document_embeddings)
--
-- Next steps:
-- 1. Migration 022: Add indexes for performance
-- 2. Migration 023: Add RLS policies
-- 3. Migration 024: Create convenience views
-- 4. Migration 025: Seed test data
--
-- ============================================
