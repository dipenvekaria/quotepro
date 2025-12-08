-- Check what's in team_members with user data
SELECT 
  tm.id,
  tm.user_id,
  tm.role,
  tm.created_at,
  u.email,
  u.raw_user_meta_data
FROM team_members tm
LEFT JOIN auth.users u ON u.id = tm.user_id
WHERE tm.company_id = '1698b6b2-97f4-42b8-bc4a-83534472c822'
ORDER BY tm.created_at DESC;
