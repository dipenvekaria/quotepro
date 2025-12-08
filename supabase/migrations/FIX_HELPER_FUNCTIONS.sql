-- ============================================
-- FIX: Replace broken helper functions
-- This fixes the get_user_role() function
-- ============================================

-- Drop old broken functions
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_owner_or_office() CASCADE;
DROP FUNCTION IF EXISTS public.can_delete() CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_settings() CASCADE;

-- Recreate get_user_company_id (team_members only)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id_result UUID;
BEGIN
  -- Get company from team_members
  SELECT company_id INTO company_id_result
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN company_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate get_user_role (team_members only)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role_result TEXT;
BEGIN
  -- Get role from team_members table
  SELECT role::text INTO user_role_result
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Default to technician if not found
  RETURN COALESCE(user_role_result, 'technician');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate helper functions
CREATE OR REPLACE FUNCTION public.is_owner_or_office()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() IN ('owner', 'office');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_delete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_manage_settings()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Test the functions
-- ============================================
SELECT 'Your user ID:' as label, auth.uid()::text as value
UNION ALL
SELECT 'Your company ID:', public.get_user_company_id()::text
UNION ALL
SELECT 'Your role:', public.get_user_role()
UNION ALL
SELECT 'Is owner/office:', public.is_owner_or_office()::text
UNION ALL
SELECT 'Can delete:', public.can_delete()::text
UNION ALL
SELECT 'Can manage settings:', public.can_manage_settings()::text;
