-- Fix Negative Prices Before Adding Constraints
-- This script identifies and fixes any data quality issues that would violate constraints

-- ============================================================
-- FIND PROBLEMATIC DATA
-- ============================================================

-- Find quote_items with negative or null unit_price
SELECT 
    id, 
    quote_id, 
    name, 
    unit_price,
    quantity
FROM quote_items
WHERE unit_price < 0 OR unit_price IS NULL
ORDER BY unit_price;

-- Find quote_items with invalid quantity
SELECT 
    id, 
    quote_id, 
    name, 
    quantity,
    unit_price
FROM quote_items
WHERE quantity <= 0 OR quantity IS NULL
ORDER BY quantity;

-- Find pricing_items with negative price
SELECT 
    id,
    company_id,
    name,
    price
FROM pricing_items
WHERE price < 0 OR price IS NULL
ORDER BY price;

-- ============================================================
-- FIX PROBLEMATIC DATA
-- ============================================================

-- Fix negative unit_price in quote_items (set to 0)
UPDATE quote_items
SET unit_price = 0
WHERE unit_price < 0;

-- Fix null unit_price in quote_items (set to 0)
UPDATE quote_items
SET unit_price = 0
WHERE unit_price IS NULL;

-- Fix invalid quantity in quote_items (set to 1)
UPDATE quote_items
SET quantity = 1
WHERE quantity <= 0 OR quantity IS NULL;

-- Fix negative pricing_items price (set to 0)
UPDATE pricing_items
SET price = 0
WHERE price < 0;

-- Fix null pricing_items price (set to 0)
UPDATE pricing_items
SET price = 0
WHERE price IS NULL;

-- Fix win_probability out of range (if ai_quote_analysis exists)
DO $$ 
BEGIN
    UPDATE ai_quote_analysis
    SET win_probability = LEAST(GREATEST(win_probability, 0), 1)
    WHERE win_probability < 0 OR win_probability > 1;
EXCEPTION WHEN undefined_table THEN 
    RAISE NOTICE 'ai_quote_analysis table does not exist yet';
END $$;

-- ============================================================
-- VERIFY FIXES
-- ============================================================

-- Should return 0 rows
SELECT COUNT(*) as bad_unit_prices
FROM quote_items
WHERE unit_price < 0 OR unit_price IS NULL;

SELECT COUNT(*) as bad_quantities
FROM quote_items
WHERE quantity <= 0 OR quantity IS NULL;

SELECT COUNT(*) as bad_pricing_items
FROM pricing_items
WHERE price < 0 OR price IS NULL;

-- ============================================================
-- SUMMARY
-- ============================================================

SELECT 
    'quote_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN unit_price = 0 THEN 1 END) as zero_price_items,
    MIN(unit_price) as min_price,
    MAX(unit_price) as max_price,
    AVG(unit_price) as avg_price
FROM quote_items
UNION ALL
SELECT 
    'pricing_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN price = 0 THEN 1 END) as zero_price_items,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(price) as avg_price
FROM pricing_items;
