-- ============================================
-- MIGRATION 028: Fix RLS Policies for Renamed Tables
-- ============================================
-- Purpose: Apply RLS policies to renamed tables (leads, quotes, etc.)
-- Issue: Tables were renamed from *_new to remove suffix, but policies still reference *_new
-- ============================================

-- Drop old policies on *_new tables (if they still exist)
DROP POLICY IF EXISTS leads_new_select_policy ON leads;
DROP POLICY IF EXISTS leads_new_insert_policy ON leads;
DROP POLICY IF EXISTS leads_new_update_policy ON leads;
DROP POLICY IF EXISTS leads_new_delete_policy ON leads;

DROP POLICY IF EXISTS quotes_new_select_policy ON quotes;
DROP POLICY IF EXISTS quotes_new_insert_policy ON quotes;
DROP POLICY IF EXISTS quotes_new_update_policy ON quotes;
DROP POLICY IF EXISTS quotes_new_delete_policy ON quotes;

DROP POLICY IF EXISTS quote_items_new_select_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_new_insert_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_new_update_policy ON quote_items;
DROP POLICY IF EXISTS quote_items_new_delete_policy ON quote_items;

DROP POLICY IF EXISTS customers_new_select_policy ON customers;
DROP POLICY IF EXISTS customers_new_insert_policy ON customers;
DROP POLICY IF EXISTS customers_new_update_policy ON customers;
DROP POLICY IF EXISTS customers_new_delete_policy ON customers;

-- Ensure RLS is enabled
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEADS POLICIES
-- ============================================

DROP POLICY IF EXISTS leads_select_policy ON leads;
CREATE POLICY leads_select_policy ON leads
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS leads_insert_policy ON leads;
CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS leads_update_policy ON leads;
CREATE POLICY leads_update_policy ON leads
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS leads_delete_policy ON leads;
CREATE POLICY leads_delete_policy ON leads
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- QUOTES POLICIES
-- ============================================

DROP POLICY IF EXISTS quotes_select_policy ON quotes;
CREATE POLICY quotes_select_policy ON quotes
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS quotes_insert_policy ON quotes;
CREATE POLICY quotes_insert_policy ON quotes
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS quotes_update_policy ON quotes;
CREATE POLICY quotes_update_policy ON quotes
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS quotes_delete_policy ON quotes;
CREATE POLICY quotes_delete_policy ON quotes
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- QUOTE_ITEMS POLICIES
-- ============================================

DROP POLICY IF EXISTS quote_items_select_policy ON quote_items;
CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_insert_policy ON quote_items;
CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_update_policy ON quote_items;
CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS quote_items_delete_policy ON quote_items;
CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id
      AND q.company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================

DROP POLICY IF EXISTS customers_select_policy ON customers;
CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS customers_insert_policy ON customers;
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS customers_update_policy ON customers;
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS customers_delete_policy ON customers;
CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- CUSTOMER_ADDRESSES POLICIES
-- ============================================

DROP POLICY IF EXISTS customer_addresses_select_policy ON customer_addresses;
CREATE POLICY customer_addresses_select_policy ON customer_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS customer_addresses_insert_policy ON customer_addresses;
CREATE POLICY customer_addresses_insert_policy ON customer_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS customer_addresses_update_policy ON customer_addresses;
CREATE POLICY customer_addresses_update_policy ON customer_addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS customer_addresses_delete_policy ON customer_addresses;
CREATE POLICY customer_addresses_delete_policy ON customer_addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_addresses.customer_id
      AND c.company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- COMPANIES POLICIES
-- ============================================

DROP POLICY IF EXISTS companies_select_policy ON companies;
CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  USING (id = public.get_user_company_id());

DROP POLICY IF EXISTS companies_update_policy ON companies;
CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  USING (id = public.get_user_company_id());

-- ============================================
-- USERS POLICIES
-- ============================================

DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS users_update_policy ON users;
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_insert_policy ON users;
CREATE POLICY users_insert_policy ON users
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

COMMENT ON POLICY leads_select_policy ON leads IS 'Users can only view leads from their company';
COMMENT ON POLICY quotes_select_policy ON quotes IS 'Users can only view quotes from their company';
COMMENT ON POLICY customers_select_policy ON customers IS 'Users can only view customers from their company';
