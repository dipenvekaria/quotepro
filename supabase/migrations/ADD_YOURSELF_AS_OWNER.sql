-- ============================================
-- FIND YOUR USER ID
-- Run this from Supabase Dashboard (you're logged in there)
-- ============================================

-- This works in the dashboard because you're authenticated there
SELECT 
  id as your_user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Copy your user_id from above, then run:
-- INSERT INTO team_members (company_id, user_id, role)
-- VALUES (
--   '1698b6b2-97f4-42b8-bc4a-83534472c822',
--   'PASTE-YOUR-USER-ID-HERE',
--   'owner'::user_role
-- );
