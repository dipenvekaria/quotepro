-- ============================================
-- MIGRATION 027: AI-Powered Job Types System
-- ============================================
-- Purpose: Support AI-driven job type classification and matching
-- Created: 2025-12-02
-- Phase: Analytics and Intelligence Enhancement
-- ============================================
--
-- This migration creates infrastructure for:
-- 1. Company-specific job type catalog (AI-generated + user-defined)
-- 2. Semantic search via vector embeddings
-- 3. Usage tracking for job type analytics
-- 4. Catalog item tracking for pricing intelligence
--
-- WORKFLOW:
-- Step 1: User uploads product CSV
-- Step 2: AI extracts job types from products (API call)
-- Step 3: AI generates embeddings for semantic matching
-- Step 4: When customer calls, AI matches description to job_type
-- Step 5: User can add custom job types manually
-- ============================================

-- ============================================
-- TABLE: JOB_TYPES
-- ============================================
-- Company-specific job type taxonomy (AI-generated + user-defined)
CREATE TABLE IF NOT EXISTS job_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  -- Job type identification
  name TEXT NOT NULL, -- e.g., "HVAC Repair - Air Conditioning"
  category TEXT, -- e.g., "HVAC", "Plumbing", "Electrical"
  subcategory TEXT, -- e.g., "Repair", "Installation", "Maintenance"
  
  -- Descriptions for AI matching
  description TEXT, -- Detailed description for better matching
  keywords TEXT[], -- Alternative keywords: ["AC repair", "air conditioner fix"]
  
  -- Vector embedding for semantic search (1536 dimensions for Gemini/OpenAI)
  embedding VECTOR(1536),
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'ai_generated',
  -- Sources: ai_generated, user_defined, csv_import
  
  -- AI metadata
  typical_products TEXT[], -- Product names often associated with this job type
  estimated_duration_hours DECIMAL(5,2), -- Typical job duration
  estimated_value_range JSONB, -- {min: 500, max: 2000, currency: "USD"}
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_job_type_name UNIQUE(company_id, name),
  CONSTRAINT valid_source CHECK (source IN ('ai_generated', 'user_defined', 'csv_import'))
);

CREATE TRIGGER job_types_updated_at 
  BEFORE UPDATE ON job_types
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for fast lookups
CREATE INDEX idx_job_types_company_id ON job_types(company_id);
CREATE INDEX idx_job_types_category ON job_types(category);
CREATE INDEX idx_job_types_is_active ON job_types(company_id, is_active);
CREATE INDEX idx_job_types_times_used ON job_types(company_id, times_used DESC);

-- GIN index for keyword array searches
CREATE INDEX idx_job_types_keywords ON job_types USING gin(keywords);

-- CRITICAL: Vector similarity search index for AI matching
CREATE INDEX idx_job_types_embedding ON job_types 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Composite index for filtered vector search
CREATE INDEX idx_job_types_company_active ON job_types(company_id, is_active) 
WHERE is_active = true;

COMMENT ON TABLE job_types IS 'AI-powered job type classification system with semantic search';
COMMENT ON COLUMN job_types.embedding IS 'Vector embedding for semantic matching of customer descriptions';
COMMENT ON COLUMN job_types.keywords IS 'Alternative phrases for text-based matching';
COMMENT ON COLUMN job_types.times_used IS 'Incremented each time this job type is used in a lead/quote';

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- 1. Add job_type_id to leads_new
ALTER TABLE leads_new ADD COLUMN job_type_id UUID REFERENCES job_types(id) ON DELETE SET NULL;
CREATE INDEX idx_leads_new_job_type_id ON leads_new(job_type_id);
COMMENT ON COLUMN leads_new.job_type_id IS 'AI-matched job type from customer description';

-- 2. Add job_type_id to quotes_new
ALTER TABLE quotes_new ADD COLUMN job_type_id UUID REFERENCES job_types(id) ON DELETE SET NULL;
CREATE INDEX idx_quotes_new_job_type_id ON quotes_new(job_type_id);
COMMENT ON COLUMN quotes_new.job_type_id IS 'Job type for this quote (inherited from lead or manually set)';

-- 3. Add job_type_id to jobs_new
ALTER TABLE jobs_new ADD COLUMN job_type_id UUID REFERENCES job_types(id) ON DELETE SET NULL;
CREATE INDEX idx_jobs_new_job_type_id ON jobs_new(job_type_id);
COMMENT ON COLUMN jobs_new.job_type_id IS 'Job type for analytics and scheduling';

-- 4. Add catalog tracking to quote_items_new
ALTER TABLE quote_items_new ADD COLUMN catalog_item_id UUID 
  REFERENCES catalog_items(id) ON DELETE SET NULL;
CREATE INDEX idx_quote_items_new_catalog_item_id ON quote_items_new(catalog_item_id);
COMMENT ON COLUMN quote_items_new.catalog_item_id IS 'Link to catalog item for pricing analytics';

-- ============================================
-- TABLE: JOB_TYPE_MATCH_LOG
-- ============================================
-- Track AI matching accuracy for continuous improvement
CREATE TABLE IF NOT EXISTS job_type_match_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies_new(id) ON DELETE CASCADE,
  
  -- The customer's description
  customer_description TEXT NOT NULL,
  customer_description_embedding VECTOR(1536),
  
  -- AI's top 3 suggestions
  ai_suggestions JSONB NOT NULL,
  -- Format: [{job_type_id: uuid, name: "HVAC Repair", confidence: 0.92}, ...]
  
  -- What user actually selected
  selected_job_type_id UUID REFERENCES job_types(id) ON DELETE SET NULL,
  was_ai_correct BOOLEAN, -- true if user selected #1 suggestion
  
  -- Context
  lead_id UUID REFERENCES leads_new(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_new(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_type_match_log_company_id ON job_type_match_log(company_id);
CREATE INDEX idx_job_type_match_log_lead_id ON job_type_match_log(lead_id);
CREATE INDEX idx_job_type_match_log_was_ai_correct ON job_type_match_log(was_ai_correct);

-- Vector search index for finding similar past descriptions
CREATE INDEX idx_job_type_match_log_embedding ON job_type_match_log 
USING hnsw (customer_description_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE job_type_match_log IS 'AI matching audit trail for accuracy tracking and model improvement';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment job_type usage counter
CREATE OR REPLACE FUNCTION increment_job_type_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_type_id IS NOT NULL THEN
    UPDATE job_types 
    SET times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = NEW.job_type_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-increment usage
CREATE TRIGGER leads_new_increment_job_type_usage
  AFTER INSERT OR UPDATE OF job_type_id ON leads_new
  FOR EACH ROW
  WHEN (NEW.job_type_id IS NOT NULL)
  EXECUTE FUNCTION increment_job_type_usage();

CREATE TRIGGER quotes_new_increment_job_type_usage
  AFTER INSERT OR UPDATE OF job_type_id ON quotes_new
  FOR EACH ROW
  WHEN (NEW.job_type_id IS NOT NULL)
  EXECUTE FUNCTION increment_job_type_usage();

CREATE TRIGGER jobs_new_increment_job_type_usage
  AFTER INSERT OR UPDATE OF job_type_id ON jobs_new
  FOR EACH ROW
  WHEN (NEW.job_type_id IS NOT NULL)
  EXECUTE FUNCTION increment_job_type_usage();

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Find job type by semantic search (vector similarity)
-- SELECT 
--   jt.name, 
--   jt.category,
--   1 - (jt.embedding <=> $1::vector) as similarity_score
-- FROM job_types jt
-- WHERE jt.company_id = $2
--   AND jt.is_active = true
-- ORDER BY jt.embedding <=> $1::vector
-- LIMIT 5;

-- Most popular job types by company
-- SELECT 
--   jt.name,
--   jt.category,
--   jt.times_used,
--   COUNT(l.id) as leads_count,
--   COUNT(q.id) as quotes_count,
--   COUNT(j.id) as jobs_count
-- FROM job_types jt
-- LEFT JOIN leads_new l ON l.job_type_id = jt.id
-- LEFT JOIN quotes_new q ON q.job_type_id = jt.id
-- LEFT JOIN jobs_new j ON j.job_type_id = jt.id
-- WHERE jt.company_id = $1
-- GROUP BY jt.id
-- ORDER BY jt.times_used DESC;

-- AI matching accuracy report
-- SELECT 
--   COUNT(*) as total_matches,
--   SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) as correct_matches,
--   ROUND(100.0 * SUM(CASE WHEN was_ai_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy_percentage
-- FROM job_type_match_log
-- WHERE company_id = $1
--   AND created_at >= NOW() - INTERVAL '30 days';

-- Revenue by job type
-- SELECT 
--   jt.name,
--   jt.category,
--   COUNT(q.id) as quote_count,
--   SUM(q.total) as total_revenue,
--   AVG(q.total) as avg_quote_value
-- FROM job_types jt
-- JOIN quotes_new q ON q.job_type_id = jt.id
-- WHERE jt.company_id = $1
--   AND q.status IN ('accepted', 'sent')
--   AND q.created_at >= NOW() - INTERVAL '90 days'
-- GROUP BY jt.id
-- ORDER BY total_revenue DESC;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  -- Check that job_types table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_types') THEN
    RAISE EXCEPTION 'job_types table not created';
  END IF;
  
  -- Check that foreign keys were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads_new' AND column_name = 'job_type_id'
  ) THEN
    RAISE EXCEPTION 'job_type_id not added to leads_new';
  END IF;
  
  RAISE NOTICE '✅ Job types system created successfully!';
  RAISE NOTICE '✅ Tables: job_types, job_type_match_log';
  RAISE NOTICE '✅ Foreign keys added to: leads_new, quotes_new, jobs_new';
  RAISE NOTICE '✅ Catalog tracking added to: quote_items_new';
  RAISE NOTICE '✅ Vector indexes created for semantic search';
  RAISE NOTICE '✅ Usage tracking triggers active';
END $$;

-- ============================================
-- NOTES FOR DEVELOPERS
-- ============================================
--
-- WORKFLOW IMPLEMENTATION:
--
-- 1. CSV Upload Endpoint (Python/Node.js):
--    - Parse CSV (pandas/papaparse)
--    - Extract unique categories/product types
--    - Call AI: "Generate job types from these products: [list]"
--    - AI returns: [{name, category, description, keywords}, ...]
--    - Generate embeddings for each job type
--    - Insert into job_types table with source='csv_import'
--
-- 2. AI Matching Endpoint:
--    - Input: customer_description = "AC blowing warm air"
--    - Generate embedding for description
--    - Vector search: SELECT * FROM job_types ORDER BY embedding <=> $1
--    - Return top 5 matches with confidence scores
--    - Log to job_type_match_log for accuracy tracking
--
-- 3. Custom Job Type Creation:
--    - User adds via UI: name, category, description
--    - Generate embedding
--    - Insert with source='user_defined'
--
-- 4. Usage Analytics:
--    - times_used auto-increments via triggers
--    - Show "Popular Job Types" dashboard
--    - Identify unused job types for cleanup
--
-- 5. Pricing Intelligence (via catalog_item_id):
--    - Track which catalog items used per job type
--    - Calculate average quote value by job type
--    - Suggest pricing adjustments
--
-- ============================================
