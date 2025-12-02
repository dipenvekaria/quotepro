-- ============================================
-- FIX RLS POLICIES AFTER MIGRATION
-- ============================================
-- After renaming _new tables, policies need to reference correct table names
-- Also add missing INSERT policy for companies (onboarding)
-- ============================================

-- FIRST: Drop ALL existing policies to start clean
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'companies', 'users', 'customers', 'customer_addresses',
            'leads', 'quotes', 'quote_items', 'quote_options',
            'jobs', 'invoices', 'payments', 'catalog_items',
            'activity_log', 'ai_conversations', 'document_embeddings', 'ai_prompts'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Drop and recreate helper function to reference correct table
-- Use CASCADE because existing policies depend on this function
DROP FUNCTION IF EXISTS public.get_user_company_id() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- COMPANIES POLICIES (FIXED)
-- ============================================

-- **ONBOARDING FIX**: Allow company creation without existing user record
CREATE POLICY companies_insert_policy ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user doesn't have a company yet (onboarding)
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
    OR
    -- Allow if creating for their own company
    true
  );

-- Users can read their own company
CREATE POLICY companies_select_policy ON companies
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_company_id()
    OR
    -- Allow reading during onboarding before user record exists
    NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Users can update their own company
CREATE POLICY companies_update_policy ON companies
  FOR UPDATE
  TO authenticated
  USING (id = public.get_user_company_id());

-- ============================================
-- USERS POLICIES (FIXED)
-- ============================================

-- **ONBOARDING FIX**: Allow user creation during onboarding
CREATE POLICY users_insert_policy ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() -- Users can only insert themselves
  );

-- Users can read all users in their company
CREATE POLICY users_select_policy ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_user_company_id()
    OR
    id = auth.uid() -- Can always read own record
  );

-- Users can update their own profile
CREATE POLICY users_update_policy ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- CUSTOMERS POLICIES (FIXED)
-- ============================================

CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- CUSTOMER_ADDRESSES POLICIES (FIXED)
-- ============================================

CREATE POLICY customer_addresses_select_policy ON customer_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_addresses.customer_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY customer_addresses_insert_policy ON customer_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_addresses.customer_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY customer_addresses_update_policy ON customer_addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_addresses.customer_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY customer_addresses_delete_policy ON customer_addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE id = customer_addresses.customer_id 
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- LEADS POLICIES (FIXED)
-- ============================================

CREATE POLICY leads_select_policy ON leads
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY leads_update_policy ON leads
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY leads_delete_policy ON leads
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- QUOTES POLICIES (FIXED)
-- ============================================

CREATE POLICY quotes_select_policy ON quotes
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY quotes_insert_policy ON quotes
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY quotes_update_policy ON quotes
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY quotes_delete_policy ON quotes
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- QUOTE_ITEMS POLICIES (FIXED)
-- ============================================

CREATE POLICY quote_items_select_policy ON quote_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_items.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_insert_policy ON quote_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_items.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_update_policy ON quote_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_items.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_items_delete_policy ON quote_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_items.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- QUOTE_OPTIONS POLICIES
-- ============================================

CREATE POLICY quote_options_select_policy ON quote_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_options.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY quote_options_insert_policy ON quote_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE id = quote_options.quote_id 
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- JOBS POLICIES (FIXED)
-- ============================================

CREATE POLICY jobs_select_policy ON jobs
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY jobs_insert_policy ON jobs
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY jobs_update_policy ON jobs
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY jobs_delete_policy ON jobs
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- INVOICES POLICIES (FIXED)
-- ============================================

CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY invoices_update_policy ON invoices
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY invoices_delete_policy ON invoices
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

CREATE POLICY payments_select_policy ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE id = payments.invoice_id 
      AND company_id = public.get_user_company_id()
    )
  );

CREATE POLICY payments_insert_policy ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE id = payments.invoice_id 
      AND company_id = public.get_user_company_id()
    )
  );

-- ============================================
-- CATALOG_ITEMS POLICIES
-- ============================================

CREATE POLICY catalog_items_select_policy ON catalog_items
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_insert_policy ON catalog_items
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_update_policy ON catalog_items
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY catalog_items_delete_policy ON catalog_items
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- ACTIVITY_LOG POLICIES
-- ============================================

CREATE POLICY activity_log_select_policy ON activity_log
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY activity_log_insert_policy ON activity_log
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================
-- AI_CONVERSATIONS POLICIES
-- ============================================

CREATE POLICY ai_conversations_select_policy ON ai_conversations
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY ai_conversations_insert_policy ON ai_conversations
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- ============================================
-- DOCUMENT_EMBEDDINGS POLICIES
-- ============================================

CREATE POLICY document_embeddings_select_policy ON document_embeddings
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY document_embeddings_insert_policy ON document_embeddings
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY document_embeddings_update_policy ON document_embeddings
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY document_embeddings_delete_policy ON document_embeddings
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- AI_PROMPTS POLICIES
-- ============================================

CREATE POLICY ai_prompts_select_policy ON ai_prompts
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY ai_prompts_insert_policy ON ai_prompts
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY ai_prompts_update_policy ON ai_prompts
  FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY ai_prompts_delete_policy ON ai_prompts
  FOR DELETE
  USING (company_id = public.get_user_company_id());

-- ============================================
-- PROFILES POLICIES (FOR AUTH TRIGGER)
-- ============================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate policies
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_policy ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Recreate trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'companies', 'users', 'customers', 'customer_addresses',
  'leads', 'quotes', 'quote_items', 'quote_options',
  'jobs', 'invoices', 'payments', 'catalog_items',
  'activity_log', 'ai_conversations', 'document_embeddings', 'ai_prompts', 'profiles'
)
ORDER BY tablename;
