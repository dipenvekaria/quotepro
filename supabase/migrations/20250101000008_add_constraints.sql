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

-- Verify line_items.quote_id references quotes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'line_items_quote_id_fkey'
    ) THEN
        ALTER TABLE line_items 
        ADD CONSTRAINT line_items_quote_id_fkey 
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
    END IF;
END $$;

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

-- Ensure quote total is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quotes_total_check'
    ) THEN
        ALTER TABLE quotes 
        ADD CONSTRAINT quotes_total_check 
        CHECK (total >= 0);
    END IF;
END $$;

-- Ensure line item quantity is positive
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'line_items_quantity_check'
    ) THEN
        ALTER TABLE line_items 
        ADD CONSTRAINT line_items_quantity_check 
        CHECK (quantity > 0);
    END IF;
END $$;

-- Ensure line item price is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'line_items_price_check'
    ) THEN
        ALTER TABLE line_items 
        ADD CONSTRAINT line_items_price_check 
        CHECK (price >= 0);
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

-- Ensure critical fields are not null
ALTER TABLE quotes ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN customer_name SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN status SET NOT NULL;
ALTER TABLE quotes ALTER COLUMN total SET NOT NULL;

ALTER TABLE line_items ALTER COLUMN quote_id SET NOT NULL;
ALTER TABLE line_items ALTER COLUMN description SET NOT NULL;
ALTER TABLE line_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE line_items ALTER COLUMN price SET NOT NULL;

ALTER TABLE pricing_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE pricing_items ALTER COLUMN name SET NOT NULL;
ALTER TABLE pricing_items ALTER COLUMN price SET NOT NULL;

ALTER TABLE ai_quote_analysis ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE ai_quote_analysis ALTER COLUMN analysis_type SET NOT NULL;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Index on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_quotes_company_status 
ON quotes(company_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at 
ON quotes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_items_quote_id 
ON line_items(quote_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_company_category 
ON pricing_items(company_id, category);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_company_type 
ON ai_quote_analysis(company_id, analysis_type);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at 
ON ai_quote_analysis(created_at DESC);

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
    AND tc.table_name IN ('companies', 'quotes', 'line_items', 'pricing_items', 'ai_quote_analysis')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Verify indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('companies', 'quotes', 'line_items', 'pricing_items', 'ai_quote_analysis')
ORDER BY tablename, indexname;

COMMENT ON CONSTRAINT quotes_total_check ON quotes IS 'Ensures quote total is non-negative';
COMMENT ON CONSTRAINT line_items_quantity_check ON line_items IS 'Ensures quantity is positive (> 0)';
COMMENT ON CONSTRAINT ai_quote_analysis_win_probability_check ON ai_quote_analysis IS 'Ensures win probability is between 0 and 1';
