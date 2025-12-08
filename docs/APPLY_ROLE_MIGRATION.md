# Apply Role-Based Permissions Migration

## Step 1: Apply the SQL Migration

Run this in your Supabase SQL editor:

```bash
# OR use Supabase CLI
supabase db push
```

This will:
1. Create new `user_role` enum with 4 roles: owner, office, sales, technician
2. Migrate existing roles: admin → office, sales → sales
3. Update all RLS policies for role-based access
4. Add helper functions for permission checks

## Step 2: Verify Migration

Check that the enum was created:
```sql
SELECT enum_range(NULL::user_role);
-- Should return: {owner,office,sales,technician}
```

Check existing team members:
```sql
SELECT id, user_id, role 
FROM team_members 
ORDER BY created_at;
```

## Step 3: Test Each Role

1. **Test as Owner**:
   - Login as company owner
   - Should see all tabs and all buttons

2. **Test as Office**:
   - Create a team member with role='office'
   - Login as that user
   - Should see all data but no Delete buttons

3. **Test as Sales**:
   - Create a team member with role='sales'
   - Login as that user
   - Should only see their own leads/quotes

4. **Test as Technician**:
   - Create a team member with role='technician'
   - Login as that user
   - Should only see Work tab with assigned jobs

## Common Issues

### Issue: 400 errors on work_items or team_members queries
**Cause**: RLS policies not yet applied or old policies still active
**Fix**: Apply the migration SQL, then refresh the page

### Issue: "undefined is not an object (evaluating 'permissions[permission]')"
**Cause**: useUserRole hook not returning permissions object
**Fix**: Already fixed in PermissionGuard.tsx with null check

### Issue: Team member shows as undefined role
**Cause**: Migration not run yet
**Fix**: Apply migration to update enum type

## Rollback (if needed)

If you need to rollback:

```sql
-- Rollback to old 2-role system
DROP TYPE user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'sales');

ALTER TABLE team_members 
  ALTER COLUMN role TYPE user_role 
  USING (
    CASE role::text
      WHEN 'owner' THEN 'admin'::user_role
      WHEN 'office' THEN 'admin'::user_role
      WHEN 'sales' THEN 'sales'::user_role
      WHEN 'technician' THEN 'sales'::user_role
      ELSE 'sales'::user_role
    END
  );
```

Then revert the RLS policies manually.
