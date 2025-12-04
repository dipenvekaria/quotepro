// User roles
export type UserRole = 'owner' | 'admin' | 'technician' | 'sales' | 'accountant' | 'member'

// Team member type
export interface TeamMember {
  id: string
  company_id: string
  user_id: string
  role: UserRole
  invited_by: string | null
  invited_at: string
  created_at: string
  updated_at: string
  user?: {
    email: string
    raw_user_meta_data?: {
      full_name?: string
      avatar_url?: string
    }
  }
}

// Permissions map
export const PERMISSIONS = {
  // Owner and Admin-only permissions
  MANAGE_COMPANY: ['owner', 'admin'],
  MANAGE_TEAM: ['owner', 'admin'],
  MANAGE_PRICING: ['owner', 'admin'],
  VIEW_SETTINGS: ['owner', 'admin'],
  MANAGE_SUBSCRIPTION: ['owner', 'admin'],
  
  // Calendar/scheduling access (office staff only - NOT technicians)
  VIEW_CALENDAR: ['owner', 'admin', 'sales', 'accountant'],
  ASSIGN_JOBS: ['owner', 'admin', 'sales'],
  
  // Owner, admin and sales can do these
  CREATE_QUOTES: ['owner', 'admin', 'sales'],
  VIEW_QUOTES: ['owner', 'admin', 'sales'],
  EDIT_QUOTES: ['owner', 'admin', 'sales'],
  SEND_QUOTES: ['owner', 'admin', 'sales'],
  
  // Technicians and above
  VIEW_ASSIGNED_JOBS: ['owner', 'admin', 'technician', 'sales'],
  COMPLETE_JOBS: ['owner', 'admin', 'technician'],
} as const

export type Permission = keyof typeof PERMISSIONS

// Check if a role has a specific permission
export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

// Check if user is owner
export function isOwner(role: UserRole | null | undefined): boolean {
  return role === 'owner'
}

// Check if user is admin
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

// Check if user is technician
export function isTechnician(role: UserRole | null | undefined): boolean {
  return role === 'technician'
}

// Check if user can see calendar (office staff only)
export function canViewCalendar(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'VIEW_CALENDAR')
}
