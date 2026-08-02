# Role-Based Permissions System

**4 Roles for Real Contractor Teams**

## Roles

### 1. Owner
**Full Access to Everything**
- Can do everything in the entire app
- Full access to leads, quotes, calendar, team management
- Can manage pricing catalog and company settings
- Can delete anything
- Can change team member roles

### 2. Office / Scheduler  
**Operations Manager**
- ✅ Can create and edit leads
- ✅ Can generate, edit, and send quotes
- ✅ Has full access to the shared calendar (can assign jobs to technicians)
- ✅ Can see all jobs and payment status
- ❌ Cannot delete quotes or jobs
- ❌ Cannot change pricing catalog or company settings

### 3. Sales
**Lead Generation**
- ✅ Can create leads
- ✅ Can generate and send quotes using AI
- ✅ Can schedule quote visits on the calendar
- ✅ Can only see their own leads and quotes
- ❌ Cannot see other people's jobs or payments
- ❌ Cannot access pricing catalog or settings

### 4. Technician
**Field Worker**
- ✅ Can only see jobs assigned to them (in the Work tab)
- ✅ Can start and complete jobs
- ✅ Can get customer signature
- ✅ Can trigger invoice after completion
- ❌ Cannot create or edit quotes
- ❌ Cannot see the full team calendar
- ❌ Cannot access leads, pricing, or settings

---

## Implementation

### Database

**Migration**: `supabase/migrations/20251207_role_based_permissions.sql`

- Updated `team_members.role` enum: `owner`, `office`, `sales`, `technician`
- Created helper functions:
  - `get_user_role()` - Returns current user's role
  - `is_owner_or_office()` - Check if user has operational access
  - `can_delete()` - Check if user can delete (owner only)
  - `can_manage_settings()` - Check if user can manage settings (owner only)

- Row Level Security (RLS) policies for all tables:
  - `work_items` - Role-based visibility (sales see own, technician see assigned, etc.)
  - `quote_items` - Follows parent work_item permissions
  - `catalog_items` - Owner and office only
  - `companies` - Owner only can update settings
  - `team_members` - Owner only can manage team

### Frontend

**Permissions Library**: `src/lib/permissions.ts`

```typescript
import { getPermissions, hasPermission } from '@/lib/permissions'

// Get all permissions for a role
const perms = getPermissions('sales')

// Check specific permission
if (hasPermission(role, 'canDeleteLeads')) {
  // Show delete button
}
```

**Permission Hook**: `src/hooks/use-user-role.ts`

```typescript
const { role, permissions, loading, companyId } = useUserRole()

// Use permissions directly
{permissions.canCreateLeads && <NewLeadButton />}
```

**Permission Guards**: `src/components/guards/PermissionGuard.tsx`

```typescript
// Hide component if user doesn't have permission
<PermissionGuard permission="canDeleteLeads">
  <DeleteButton />
</PermissionGuard>

// Only show for specific roles
<RoleGuard allowedRoles={['owner', 'office']}>
  <AdminPanel />
</RoleGuard>
```

### Backend

**Python Role Validation** (TODO):
- Add role checks in API endpoints
- Verify user has permission before executing actions
- Return 403 Forbidden if insufficient permissions

---

## Navigation & UI

### Technician View
- **Default Route**: `/work`
- **Available Tabs**: Work only
- **Hidden**: Leads, Quotes, Calendar, Settings

### Sales View
- **Default Route**: `/leads-and-quotes/leads`
- **Available Tabs**: Work (own), Leads & Quotes (own), Calendar (limited)
- **Hidden**: Full team calendar, Settings, Catalog

### Office View
- **Default Route**: `/leads-and-quotes/leads`
- **Available Tabs**: All (Work, Leads & Quotes, Calendar)
- **Hidden**: Settings, Catalog management

### Owner View
- **Default Route**: `/leads-and-quotes/leads`
- **Available Tabs**: All including Settings
- **Full Access**: Everything

---

## Team Management

### Inviting Team Members

1. **Owner** goes to Settings → Team
2. Click "Invite Team Member"
3. Enter email and select role:
   - Office / Scheduler
   - Sales
   - Technician
4. Send invite
5. **Default role**: Technician (most restricted)

### Changing Roles

- **Only Owner** can change team member roles
- Go to Settings → Team → Edit member → Select new role
- Changes take effect immediately

---

## Testing

### Test Each Role

1. **Owner**:
   - ✅ Can see all leads, quotes, jobs
   - ✅ Can delete items
   - ✅ Can access settings and catalog
   - ✅ Can manage team members

2. **Office**:
   - ✅ Can see all leads, quotes, jobs
   - ✅ Can create and edit everything
   - ❌ Cannot delete
   - ❌ Cannot access settings

3. **Sales**:
   - ✅ Can create leads and quotes
   - ✅ Can only see own items
   - ❌ Cannot see other sales' leads
   - ❌ Cannot access catalog

4. **Technician**:
   - ✅ Can see assigned jobs
   - ✅ Can complete jobs
   - ❌ Cannot see leads or quotes
   - ❌ Cannot access calendar

---

## Security

- **RLS Enforced**: All database access filtered by role
- **Frontend Guards**: Buttons/tabs hidden based on permissions
- **Backend Validation**: API endpoints check role (TODO)
- **Default to Least Privilege**: Unknown roles default to technician

---

## Future Enhancements

- [ ] Audit log for role changes
- [ ] Custom permissions per user
- [ ] Temporary elevated access
- [ ] Role-based email notifications
