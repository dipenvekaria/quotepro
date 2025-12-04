-- ============================================
-- MIGRATION 025: Seed Test Data
-- ============================================
-- Purpose: Insert test company and sample data for development
-- Created: 2024-11-30
-- Phase: 1 - Database Schema Redesign
-- Risk: LOW (test data only, can be deleted anytime)
-- ============================================
--
-- This migration creates:
-- 1. Test company "Demo HVAC Company"
-- 2. Sample customer "John Smith"
-- 3. Sample lead
-- 4. Sample quote with items
-- 5. Sample catalog items
--
-- NOTE: This is for development/testing only.
-- All data uses '_test' or 'demo' markers for easy cleanup.
-- ============================================

-- ============================================
-- DISABLE RLS FOR SEEDING (use service role)
-- ============================================
-- This migration runs with service_role credentials
-- which bypass RLS policies

-- ============================================
-- SEED: TEST COMPANY
-- ============================================

DO $$
DECLARE
  test_company_id UUID;
  test_customer_id UUID;
  test_customer_address_id UUID;
  test_lead_id UUID;
  test_quote_id UUID;
BEGIN
  -- Insert test company (idempotent - check if exists first)
  INSERT INTO companies_new (id, name, email, phone, address, settings)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo HVAC Company',
    'demo@quotepro.com',
    '(555) 123-4567',
    '123 Main St, San Francisco, CA 94102',
    jsonb_build_object(
      'tax_rate', 8.5,
      'currency', 'USD',
      'timezone', 'America/Los_Angeles',
      'ai_preferences', jsonb_build_object(
        'default_model', 'gemini-2.0-flash',
        'temperature', 0.1,
        'max_tokens', 2000
      )
    )
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO test_company_id;

  -- Get company_id if it already existed
  IF test_company_id IS NULL THEN
    test_company_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  RAISE NOTICE '✅ Test company created/exists: %', test_company_id;

  -- ============================================
  -- SEED: TEST CUSTOMER
  -- ============================================

  INSERT INTO customers_new (id, company_id, name, email, phone, metadata)
  VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    test_company_id,
    'John Smith',
    'john.smith@example.com',
    '(555) 987-6543',
    jsonb_build_object('source', 'demo', 'tags', ARRAY['residential', 'demo'])
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO test_customer_id;

  IF test_customer_id IS NULL THEN
    test_customer_id := '00000000-0000-0000-0000-000000000002'::uuid;
  END IF;

  RAISE NOTICE '✅ Test customer created/exists: %', test_customer_id;

  -- ============================================
  -- SEED: CUSTOMER ADDRESS
  -- ============================================

  INSERT INTO customer_addresses (id, customer_id, label, address, city, state, zip, is_primary)
  VALUES (
    '00000000-0000-0000-0000-000000000003'::uuid,
    test_customer_id,
    'home',
    '456 Oak Avenue',
    'San Francisco',
    'CA',
    '94115',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Customer address created/exists';

  -- ============================================
  -- SEED: TEST LEAD
  -- ============================================

  INSERT INTO leads_new (id, company_id, customer_id, source, status, description, urgency, estimated_value)
  VALUES (
    '00000000-0000-0000-0000-000000000004'::uuid,
    test_company_id,
    test_customer_id,
    'website',
    'new',
    'Customer needs HVAC system replacement for 2-story home',
    'high',
    5500.00
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO test_lead_id;

  IF test_lead_id IS NULL THEN
    test_lead_id := '00000000-0000-0000-0000-000000000004'::uuid;
  END IF;

  RAISE NOTICE '✅ Test lead created/exists: %', test_lead_id;

  -- ============================================
  -- SEED: TEST QUOTE
  -- ============================================

  INSERT INTO quotes_new (
    id, company_id, customer_id, lead_id, quote_number, job_name, description,
    subtotal, discount_amount, tax_rate, tax_amount, total, status
  )
  VALUES (
    '00000000-0000-0000-0000-000000000005'::uuid,
    test_company_id,
    test_customer_id,
    test_lead_id,
    'Q-2025-001',
    'HVAC System Replacement',
    'Complete HVAC system replacement with installation',
    5000.00,
    0.00,
    8.5,
    425.00,
    5425.00,
    'draft'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO test_quote_id;

  IF test_quote_id IS NULL THEN
    test_quote_id := '00000000-0000-0000-0000-000000000005'::uuid;
  END IF;

  RAISE NOTICE '✅ Test quote created/exists: %', test_quote_id;

  -- ============================================
  -- SEED: QUOTE ITEMS
  -- ============================================

  INSERT INTO quote_items_new (quote_id, name, description, quantity, unit_price, total, sort_order)
  VALUES
    (test_quote_id, 'HVAC System - Carrier 3 Ton', 'High-efficiency central air system', 1, 3500.00, 3500.00, 1),
    (test_quote_id, 'Installation Labor', 'Professional installation with 2-person crew', 8, 125.00, 1000.00, 2),
    (test_quote_id, 'Thermostat Upgrade', 'Smart WiFi thermostat', 1, 250.00, 250.00, 3),
    (test_quote_id, 'Ductwork Repair', 'Minor duct sealing and repair', 1, 250.00, 250.00, 4)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Quote items created/exists';

  -- ============================================
  -- SEED: CATALOG ITEMS
  -- ============================================

  INSERT INTO catalog_items (company_id, name, description, category, subcategory, base_price, unit, tags, labor_hours)
  VALUES
    (test_company_id, 'HVAC System - 2 Ton', 'Central air conditioning system - 2 ton capacity', 'HVAC', 'Air Conditioning', 2800.00, 'each', ARRAY['hvac', 'ac', '2-ton'], 6.0),
    (test_company_id, 'HVAC System - 3 Ton', 'Central air conditioning system - 3 ton capacity', 'HVAC', 'Air Conditioning', 3500.00, 'each', ARRAY['hvac', 'ac', '3-ton'], 8.0),
    (test_company_id, 'HVAC System - 4 Ton', 'Central air conditioning system - 4 ton capacity', 'HVAC', 'Air Conditioning', 4200.00, 'each', ARRAY['hvac', 'ac', '4-ton'], 10.0),
    (test_company_id, 'Installation Labor', 'Professional HVAC installation', 'Labor', 'Installation', 125.00, 'hour', ARRAY['labor', 'installation'], 1.0),
    (test_company_id, 'Smart Thermostat', 'WiFi-enabled programmable thermostat', 'Accessories', 'Controls', 250.00, 'each', ARRAY['thermostat', 'smart', 'wifi'], 1.0),
    (test_company_id, 'Duct Cleaning', 'Complete air duct cleaning service', 'Services', 'Maintenance', 350.00, 'each', ARRAY['duct', 'cleaning', 'maintenance'], 3.0),
    (test_company_id, 'Furnace Tune-Up', 'Annual furnace maintenance and inspection', 'Services', 'Maintenance', 150.00, 'each', ARRAY['furnace', 'maintenance', 'tune-up'], 2.0),
    (test_company_id, 'Emergency Service Call', '24/7 emergency HVAC service', 'Services', 'Emergency', 200.00, 'each', ARRAY['emergency', '24-7', 'service'], 0.5)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Catalog items created/exists';

  -- ============================================
  -- SUMMARY
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Test data seeding complete!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Company ID: %', test_company_id;
  RAISE NOTICE 'Customer ID: %', test_customer_id;
  RAISE NOTICE 'Lead ID: %', test_lead_id;
  RAISE NOTICE 'Quote ID: %', test_quote_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Test the new schema with real data';
  RAISE NOTICE '2. Query views: SELECT * FROM quote_details_view;';
  RAISE NOTICE '3. Test RLS policies (user must belong to company)';
  RAISE NOTICE '';
  RAISE NOTICE 'To clean up test data:';
  RAISE NOTICE 'DELETE FROM companies_new WHERE id = ''00000000-0000-0000-0000-000000000001'';';
  RAISE NOTICE '';

END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  company_count INTEGER;
  customer_count INTEGER;
  quote_count INTEGER;
  catalog_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO company_count FROM companies_new;
  SELECT COUNT(*) INTO customer_count FROM customers_new;
  SELECT COUNT(*) INTO quote_count FROM quotes_new;
  SELECT COUNT(*) INTO catalog_count FROM catalog_items;

  RAISE NOTICE '✅ Database stats:';
  RAISE NOTICE '  - Companies: %', company_count;
  RAISE NOTICE '  - Customers: %', customer_count;
  RAISE NOTICE '  - Quotes: %', quote_count;
  RAISE NOTICE '  - Catalog items: %', catalog_count;
END $$;

-- Quick test queries
SELECT 
  'Test Company' as test,
  name,
  email,
  phone
FROM companies_new
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 
  'Test Quote with Items' as test,
  quote_number,
  customer_name,
  total,
  item_count
FROM quote_details_view
WHERE id = '00000000-0000-0000-0000-000000000005';

-- ============================================
-- NOTES
-- ============================================
-- 
-- ✅ Test data seeded successfully
-- ✅ Company: Demo HVAC Company
-- ✅ Customer: John Smith with address
-- ✅ Lead: HVAC replacement request
-- ✅ Quote: $5,425 with 4 line items
-- ✅ Catalog: 8 common HVAC items
--
-- Next steps:
-- 1. Generate TypeScript types
-- 2. Verify existing app still works
-- 3. Create Phase 1 documentation
--
-- ============================================
