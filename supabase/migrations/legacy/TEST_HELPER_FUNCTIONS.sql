-- Test if helper functions are working
SELECT 
  auth.uid() as my_user_id,
  public.get_user_company_id() as my_company_id,
  public.get_user_role() as my_role;

-- Also check if the functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_company_id', 'get_user_role', 'is_owner_or_office', 'can_delete', 'can_manage_settings')
ORDER BY p.proname;
