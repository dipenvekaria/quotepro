// User roles
export type UserRole = 'admin' | 'sales'

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
  // Admin-only permissions
  MANAGE_COMPANY: ['admin'],
  MANAGE_TEAM: ['admin'],
  MANAGE_PRICING: ['admin'],
  VIEW_SETTINGS: ['admin'],
  MANAGE_SUBSCRIPTION: ['admin'],
  
  // Both admin and sales can do these
  CREATE_QUOTES: ['admin', 'sales'],
  VIEW_QUOTES: ['admin', 'sales'],
  EDIT_QUOTES: ['admin', 'sales'],
  SEND_QUOTES: ['admin', 'sales'],
} as const

export type Permission = keyof typeof PERMISSIONS

// Check if a role has a specific permission
export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

// Check if user is admin
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

// Check if user is sales
export function isSales(role: UserRole | null | undefined): boolean {
  return role === 'sales'
}
