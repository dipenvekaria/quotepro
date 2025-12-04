-- ============================================
-- QUICK FIX: Apply RLS Policies Manually
-- ============================================
-- Run this in Supabase SQL Editor to fix access control errors
-- ============================================

-- LEADS
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

-- QUOTES
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

-- CUSTOMERS
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
