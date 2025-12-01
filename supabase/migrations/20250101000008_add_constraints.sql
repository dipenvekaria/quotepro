-- Database Constraints Review & Enhancement
-- Run this to add missing constraints for data integrity

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

-- Verify quotes.company_id references companies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quotes_company_id_fkey'
    ) THEN
        ALTER TABLE quotes 
        ADD CONSTRAINT quotes_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify quote_items.quote_id references quotes (already exists in schema)
-- DO $$ 
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'quote_items_quote_id_fkey'
--     ) THEN
--         ALTER TABLE quote_items 
--         ADD CONSTRAINT quote_items_quote_id_fkey 
--         FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
--     END IF;
-- END $$;

-- Verify pricing_items.company_id references companies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pricing_items_company_id_fkey'
    ) THEN
        ALTER TABLE pricing_items 
        ADD CONSTRAINT pricing_items_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify ai_quote_analysis.company_id references companies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_quote_analysis_company_id_fkey'
    ) THEN
        ALTER TABLE ai_quote_analysis 
        ADD CONSTRAINT ai_quote_analysis_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify ai_quote_analysis.quote_id references quotes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_quote_analysis_quote_id_fkey'
    ) THEN
        ALTER TABLE ai_quote_analysis 
        ADD CONSTRAINT ai_quote_analysis_quote_id_fkey 
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- CHECK CONSTRAINTS
-- ============================================================

-- Ensure quote total is non-negative (already enforced in schema)
-- Quote totals are calculated, so no need for separate constraint

-- Ensure quote item quantity is positive
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quote_items_quantity_check'
    ) THEN
        ALTER TABLE quote_items 
        ADD CONSTRAINT quote_items_quantity_check 
        CHECK (quantity > 0);
    END IF;
END $$;

-- Ensure quote item unit_price is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quote_items_unit_price_check'
    ) THEN
        ALTER TABLE quote_items 
        ADD CONSTRAINT quote_items_unit_price_check 
        CHECK (unit_price >= 0);
    END IF;
END $$;

-- Ensure pricing item price is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'pricing_items_price_check'
    ) THEN
        ALTER TABLE pricing_items 
        ADD CONSTRAINT pricing_items_price_check 
        CHECK (price >= 0);
    END IF;
END $$;

-- Ensure win probability is between 0 and 1
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_quote_analysis_win_probability_check'
    ) THEN
        ALTER TABLE ai_quote_analysis 
        ADD CONSTRAINT ai_quote_analysis_win_probability_check 
        CHECK (win_probability >= 0 AND win_probability <= 1);
    END IF;
END $$;

-- Ensure analysis_type is valid
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ai_quote_analysis_type_check'
    ) THEN
        ALTER TABLE ai_quote_analysis 
        ADD CONSTRAINT ai_quote_analysis_type_check 
        CHECK (analysis_type IN ('optimizer', 'upsell', 'rag', 'generation'));
    END IF;
END $$;

-- ============================================================
-- NOT NULL CONSTRAINTS
-- ============================================================

-- Most NOT NULL constraints already exist in schema
-- Only add if missing

-- Verify quote_items critical fields
DO $$ BEGIN
    ALTER TABLE quote_items ALTER COLUMN quote_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE quote_items ALTER COLUMN name SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE quote_items ALTER COLUMN quantity SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE quote_items ALTER COLUMN unit_price SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- AI analytics (if table exists)
DO $$ BEGIN
    ALTER TABLE ai_quote_analysis ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE ai_quote_analysis ALTER COLUMN analysis_type SET NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Index on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_quotes_company_status 
ON quotes(company_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at 
ON quotes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id 
ON quote_items(quote_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_company_category 
ON pricing_items(company_id, category);

-- AI analytics indexes (if table exists)
DO $$ 
BEGIN
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_company_type 
    ON ai_quote_analysis(company_id, analysis_type);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at 
    ON ai_quote_analysis(created_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- SUMMARY QUERY
-- ============================================================

-- View all constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('companies', 'quotes', 'quote_items', 'pricing_items', 'ai_quote_analysis')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Verify indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('companies', 'quotes', 'quote_items', 'pricing_items', 'ai_quote_analysis')
ORDER BY tablename, indexname;

-- Add comments on new constraints
DO $$ BEGIN
    COMMENT ON CONSTRAINT quote_items_quantity_check ON quote_items IS 'Ensures quantity is positive (> 0)';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
    COMMENT ON CONSTRAINT quote_items_unit_price_check ON quote_items IS 'Ensures unit price is non-negative';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
    COMMENT ON CONSTRAINT ai_quote_analysis_win_probability_check ON ai_quote_analysis IS 'Ensures win probability is between 0 and 1';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
