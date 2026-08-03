-- ============================================================================
-- Signup + onboarding helpers
-- ============================================================================
-- Enables the sign-up → onboarding → dashboard flow:
--   * Auto-create a public.users row for every new auth.users signup (even
--     without a company_id, so the FK exists before onboarding).
--   * Let authenticated users INSERT a company + link themselves as owner
--     via bootstrap_company() SECURITY DEFINER RPC.
--   * Relax the users self-update policy so onboarding can set company_id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Auto-create public.users on signup (always, not just when company_id set)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;

  INSERT INTO public.users (id, company_id, role, profile)
  VALUES (
    NEW.id,
    v_company_id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'owner'),
    jsonb_build_object(
      'first_name', NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      'last_name', NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
      'phone', NULLIF(NEW.phone, ''),
      'avatar_url', NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Users self-update: allow company_id transition when currently NULL
-- ----------------------------------------------------------------------------

-- The previous WITH CHECK froze `role`. Relax to allow onboarding to set
-- company_id + role on a user record that has no company yet.
DROP POLICY IF EXISTS users_update_self ON public.users;

CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Companies: allow authenticated users to create their first company
-- ----------------------------------------------------------------------------
-- Guard: only if the caller doesn't already have a company_id set.

CREATE POLICY companies_insert_first ON public.companies FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid() AND u.company_id IS NOT NULL
    )
  );

-- ----------------------------------------------------------------------------
-- 4. bootstrap_company() RPC — atomic signup finalize
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bootstrap_company(
  p_name     TEXT,
  p_logo_url TEXT DEFAULT NULL,
  p_phone    TEXT DEFAULT NULL,
  p_email    TEXT DEFAULT NULL,
  p_address  TEXT DEFAULT NULL,
  p_seed_catalog BOOLEAN DEFAULT TRUE
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_user_id    UUID;
  v_company_id UUID;
  v_existing   UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Idempotent — return existing company if the caller already has one.
  SELECT company_id INTO v_existing FROM public.users WHERE id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'company name required';
  END IF;

  INSERT INTO public.companies (name, logo_url, phone, email, address)
  VALUES (trim(p_name), p_logo_url, p_phone, p_email, p_address)
  RETURNING id INTO v_company_id;

  UPDATE public.users
     SET company_id = v_company_id,
         role       = 'owner'
   WHERE id = v_user_id;

  -- Seed a starter catalog so first-quote UX isn't empty.
  IF p_seed_catalog THEN
    INSERT INTO public.catalog_items (company_id, name, description, category, base_price, unit)
    VALUES
      (v_company_id, 'Standard Labor',         'Hourly technician rate',                 'Labor',    125.00, 'hour'),
      (v_company_id, 'Emergency Labor',        'After-hours / weekend rate',             'Labor',    195.00, 'hour'),
      (v_company_id, 'Trip Fee',               'Diagnostic visit',                        'Labor',     89.00, 'each'),
      (v_company_id, 'Permit Fee',             'City building permit pass-through',       'Labor',    150.00, 'each');
  END IF;

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_company(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_company(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
