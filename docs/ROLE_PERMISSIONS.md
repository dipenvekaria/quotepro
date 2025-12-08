# Role-Based Permissions System

## Overview
QuotePro uses a 4-role system based on real contractor teams in 2025.

## The 4 Roles

### 1. Owner
**Full access to everything**
- Can view, create, edit, and **delete** all leads, quotes, and jobs
- Full access to team calendar and scheduling
- Can manage pricing catalog
- Can change company settings
- Can invite team members and change their roles
- Can access all payment information

### 2. Office / Scheduler
**Operations manager role**
- Can view and manage **all** leads, quotes, and jobs in the company
- Full access to team calendar
- Can assign jobs to technicians
- Can see all payment status
- **Cannot** delete quotes or jobs
- **Cannot** change pricing catalog
- **Cannot** change company settings

### 3. Sales
**Create leads and quotes (own only)**
- Can create new leads
- Can generate and send quotes using AI
- Can schedule quote visits on calendar
- Can **only see their own** leads and quotes
- **Cannot** see other salespeople's work
- **Cannot** see jobs or payments
- **Cannot** access pricing catalog or settings

### 4. Technician
**Field worker role**
- Can **only see jobs assigned to them** (Work tab)
- Can start and complete jobs
- Can get customer signatures
- Can trigger invoice after job completion
- **Cannot** create or edit quotes
- **Cannot** see full team calendar
- **Cannot** access leads, pricing, or settings

## Permission Matrix

| Feature | Owner | Office | Sales | Technician |
|---------|-------|--------|-------|------------|
| **Leads** |
| View all leads | ✅ | ✅ | ❌ | ❌ |
| View own leads | ✅ | ✅ | ✅ | ❌ |
| Create leads | ✅ | ✅ | ✅ | ❌ |
| Edit leads | ✅ | ✅ | ✅ | ❌ |
| Delete leads | ✅ | ❌ | ❌ | ❌ |
| **Quotes** |
| View all quotes | ✅ | ✅ | ❌ | ❌ |
| View own quotes | ✅ | ✅ | ✅ | ❌ |
| Create quotes | ✅ | ✅ | ✅ | ❌ |
| Edit quotes | ✅ | ✅ | ✅ | ❌ |
| Send quotes | ✅ | ✅ | ✅ | ❌ |
| Delete quotes | ✅ | ❌ | ❌ | ❌ |
| **Jobs** |
| View all jobs | ✅ | ✅ | ❌ | ❌ |
| View assigned jobs | ✅ | ✅ | ❌ | ✅ |
| Start/complete jobs | ✅ | ✅ | ❌ | ✅ |
| Assign jobs | ✅ | ✅ | ❌ | ❌ |
| **Calendar** |
| View full calendar | ✅ | ✅ | ✅ | ❌ |
| Edit calendar | ✅ | ✅ | ✅ | ❌ |
| Schedule jobs | ✅ | ✅ | ❌ | ❌ |
| **Pricing** |
| View catalog | ✅ | ✅ | ❌ | ❌ |
| Edit catalog | ✅ | ❌ | ❌ | ❌ |
| **Settings** |
| Manage settings | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| **Payments** |
| View all payments | ✅ | ✅ | ❌ | ❌ |
| Trigger invoice | ✅ | ✅ | ❌ | ✅ |
| **General** |
| Delete anything | ✅ | ❌ | ❌ | ❌ |

## Technical Implementation

### Database (Supabase)
- **Enum Type**: `user_role` with values: `owner`, `office`, `sales`, `technician`
- **Storage**: Role stored in `team_members.role` column
- **Owner Detection**: User is owner if they created the company (`companies.user_id`)
- **RLS Policies**: All access controlled by Row Level Security based on role

### Frontend (React/Next.js)
- **Hook**: `useUserRole()` returns `{ role, permissions, loading, companyId }`
- **Permissions**: Pre-calculated object with boolean flags for each permission
- **Guards**: `<PermissionGuard permission="canDeleteLeads">` components
- **Navigation**: Tabs/routes filtered by role (technicians only see Work tab)

### Backend (Python)
- Role checks in API endpoints (TODO)
- Additional validation layer beyond RLS

## Default Behavior
- **New team members**: Default role is `technician` (most restricted)
- **Company owner**: Always has `owner` role (cannot be changed)
- **Role changes**: Only owner can change team member roles

## UI Behavior by Role

### Owner
- Sees: All tabs (Leads & Quotes, Work, Calendar, Settings)
- Default route: `/leads-and-quotes/leads`
- Buttons: All visible (including Delete/Archive)

### Office
- Sees: Leads & Quotes, Work, Calendar tabs
- Default route: `/leads-and-quotes/leads`
- Buttons: All except Delete/Archive

### Sales
- Sees: Leads & Quotes, Calendar tabs (filtered to own data)
- Default route: `/leads-and-quotes/leads`
- Buttons: Create, Edit, Send (no Delete/Archive)

### Technician
- Sees: **Only Work tab** (assigned jobs)
- Default route: `/work`
- Buttons: Start Job, Complete Job, Get Signature, Trigger Invoice

## Migration Notes
- Existing `admin` roles automatically migrated to `office`
- Existing `sales` roles remain as `sales`
- Migration preserves all team member data
- RLS policies updated to enforce new permission rules

## Usage in Code

### Check permissions in components:
```tsx
import { useUserRole } from '@/hooks/use-user-role'

function MyComponent() {
  const { permissions } = useUserRole()
  
  return (
    <div>
      {permissions.canDeleteLeads && (
        <button>Delete Lead</button>
      )}
    </div>
  )
}
```

### Use permission guards:
```tsx
import { PermissionGuard } from '@/components/guards/PermissionGuard'

function LeadCard() {
  return (
    <div>
      <PermissionGuard permission="canDeleteLeads">
        <button>Archive</button>
      </PermissionGuard>
    </div>
  )
}
```

### Check specific role:
```tsx
import { RoleGuard } from '@/components/guards/PermissionGuard'

function AdminPanel() {
  return (
    <RoleGuard allowedRoles={['owner']}>
      <div>Owner-only content</div>
    </RoleGuard>
  )
}
```

## Security Notes
- **Defense in depth**: Permissions enforced at database (RLS), backend (API), and frontend (UI)
- **Owner privileges**: Company owner always has full access (cannot be downgraded)
- **Fail secure**: If role is undefined, defaults to most restricted (technician)
- **Real-time updates**: Role changes take effect on next page load/auth refresh
