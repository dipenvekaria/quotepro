-- ============================================
-- MIGRATION 027: Add Job Type Support
-- ============================================
-- Purpose: Add job_type to NEW SCHEMA ONLY for standardized job classification
-- Created: 2025-12-01
-- Phase: 3 - Frontend Refactor (Week 1)
-- NOTE: Only modifies new schema tables (_new suffix), old schema untouched
-- ============================================

-- Add job_type column to catalog_items (new schema only)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'catalog_items') THEN
    ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS job_type TEXT;
    COMMENT ON COLUMN catalog_items.job_type IS 'Standardized job type (e.g., "Faucet Replacement", "HVAC Installation") - used by AI to classify jobs';
    
    -- Create index for faster job type lookups
    CREATE INDEX IF NOT EXISTS idx_catalog_items_job_type ON catalog_items(job_type) WHERE job_type IS NOT NULL;
  END IF;
END $$;

-- Add job_type column to quotes_new (new schema only)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotes_new') THEN
    ALTER TABLE quotes_new ADD COLUMN IF NOT EXISTS job_type TEXT;
    COMMENT ON COLUMN quotes_new.job_type IS 'Standardized job type selected from catalog';
    
    -- Create index for faster job type lookups
    CREATE INDEX IF NOT EXISTS idx_quotes_new_job_type ON quotes_new(job_type) WHERE job_type IS NOT NULL;
  END IF;
END $$;

-- Add job_type column to leads_new (new schema only)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads_new') THEN
    ALTER TABLE leads_new ADD COLUMN IF NOT EXISTS job_type TEXT;
    COMMENT ON COLUMN leads_new.job_type IS 'Standardized job type classification';
    
    -- Create index for faster job type lookups
    CREATE INDEX IF NOT EXISTS idx_leads_new_job_type ON leads_new(job_type) WHERE job_type IS NOT NULL;
  END IF;
END $$;

-- Update seed data with common HVAC/Plumbing job types in catalog_items (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'catalog_items') THEN
    UPDATE catalog_items SET job_type = 'HVAC Installation' WHERE name ILIKE '%install%' AND (name ILIKE '%hvac%' OR name ILIKE '%ac%' OR name ILIKE '%furnace%');
    UPDATE catalog_items SET job_type = 'HVAC Repair' WHERE name ILIKE '%repair%' AND (name ILIKE '%hvac%' OR name ILIKE '%ac%' OR name ILIKE '%furnace%');
    UPDATE catalog_items SET job_type = 'HVAC Maintenance' WHERE name ILIKE '%maintenan%' AND (name ILIKE '%hvac%' OR name ILIKE '%ac%' OR name ILIKE '%furnace%');
    UPDATE catalog_items SET job_type = 'Water Heater Installation' WHERE name ILIKE '%water heater%' AND name ILIKE '%install%';
    UPDATE catalog_items SET job_type = 'Water Heater Repair' WHERE name ILIKE '%water heater%' AND name ILIKE '%repair%';
    UPDATE catalog_items SET job_type = 'Plumbing Repair' WHERE name ILIKE '%plumb%' AND name ILIKE '%repair%';
    UPDATE catalog_items SET job_type = 'Drain Cleaning' WHERE name ILIKE '%drain%' AND (name ILIKE '%clean%' OR name ILIKE '%snake%');
    UPDATE catalog_items SET job_type = 'Pipe Repair' WHERE name ILIKE '%pipe%' AND name ILIKE '%repair%';
    UPDATE catalog_items SET job_type = 'Faucet Replacement' WHERE name ILIKE '%faucet%';
    UPDATE catalog_items SET job_type = 'Toilet Repair' WHERE name ILIKE '%toilet%' AND name ILIKE '%repair%';
    UPDATE catalog_items SET job_type = 'Emergency Service' WHERE name ILIKE '%emergency%';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Uncomment to verify changes:
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'job_type' ORDER BY table_name;
-- SELECT DISTINCT job_type FROM catalog_items WHERE job_type IS NOT NULL ORDER BY job_type;
