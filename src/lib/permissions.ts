/**
 * Role-Based Permissions System
 * 
 * 4 Roles matching real contractor teams:
 * - owner: Full access to everything
 * - office: Operations manager (leads, quotes, calendar, jobs)
 * - sales: Create leads and quotes (own only)
 * - technician: View assigned jobs only
 */

export type UserRole = 'owner' | 'office' | 'sales' | 'technician'

export interface RolePermissions {
  // Leads
  canViewAllLeads: boolean
  canViewOwnLeads: boolean
  canCreateLeads: boolean
  canEditLeads: boolean
  canDeleteLeads: boolean
  
  // Quotes
  canViewAllQuotes: boolean
  canViewOwnQuotes: boolean
  canCreateQuotes: boolean
  canEditQuotes: boolean
  canSendQuotes: boolean
  canDeleteQuotes: boolean
  
  // Jobs/Work Items
  canViewAllJobs: boolean
  canViewAssignedJobs: boolean
  canStartJobs: boolean
  canCompleteJobs: boolean
  canAssignJobs: boolean
  
  // Calendar
  canViewFullCalendar: boolean
  canEditCalendar: boolean
  canScheduleJobs: boolean
  
  // Pricing/Catalog
  canViewCatalog: boolean
  canEditCatalog: boolean
  
  // Settings
  canManageSettings: boolean
  canManageTeam: boolean
  canInviteMembers: boolean
  canChangeRoles: boolean
  
  // Payments
  canViewAllPayments: boolean
  canTriggerInvoice: boolean
  
  // General
  canDelete: boolean
}

/**
 * Permission matrix for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    // Full access to everything
    canViewAllLeads: true,
    canViewOwnLeads: true,
    canCreateLeads: true,
    canEditLeads: true,
    canDeleteLeads: true,
    
    canViewAllQuotes: true,
    canViewOwnQuotes: true,
    canCreateQuotes: true,
    canEditQuotes: true,
    canSendQuotes: true,
    canDeleteQuotes: true,
    
    canViewAllJobs: true,
    canViewAssignedJobs: true,
    canStartJobs: true,
    canCompleteJobs: true,
    canAssignJobs: true,
    
    canViewFullCalendar: true,
    canEditCalendar: true,
    canScheduleJobs: true,
    
    canViewCatalog: true,
    canEditCatalog: true,
    
    canManageSettings: true,
    canManageTeam: true,
    canInviteMembers: true,
    canChangeRoles: true,
    
    canViewAllPayments: true,
    canTriggerInvoice: true,
    
    canDelete: true,
  },
  
  office: {
    // Can manage operations, cannot delete or change settings
    canViewAllLeads: true,
    canViewOwnLeads: true,
    canCreateLeads: true,
    canEditLeads: true,
    canDeleteLeads: false, // Cannot delete
    
    canViewAllQuotes: true,
    canViewOwnQuotes: true,
    canCreateQuotes: true,
    canEditQuotes: true,
    canSendQuotes: true,
    canDeleteQuotes: false, // Cannot delete
    
    canViewAllJobs: true,
    canViewAssignedJobs: true,
    canStartJobs: true,
    canCompleteJobs: true,
    canAssignJobs: true,
    
    canViewFullCalendar: true,
    canEditCalendar: true,
    canScheduleJobs: true,
    
    canViewCatalog: true,
    canEditCatalog: false, // Cannot edit pricing
    
    canManageSettings: false, // Cannot change settings
    canManageTeam: false,
    canInviteMembers: false,
    canChangeRoles: false,
    
    canViewAllPayments: true,
    canTriggerInvoice: true,
    
    canDelete: false,
  },
  
  sales: {
    // Can create leads and quotes (own only)
    canViewAllLeads: false,
    canViewOwnLeads: true,
    canCreateLeads: true,
    canEditLeads: true,
    canDeleteLeads: false,
    
    canViewAllQuotes: false,
    canViewOwnQuotes: true,
    canCreateQuotes: true,
    canEditQuotes: true,
    canSendQuotes: true,
    canDeleteQuotes: false,
    
    canViewAllJobs: false,
    canViewAssignedJobs: false,
    canStartJobs: false,
    canCompleteJobs: false,
    canAssignJobs: false,
    
    canViewFullCalendar: true, // Can schedule quote visits
    canEditCalendar: true, // Can add appointments
    canScheduleJobs: false, // Cannot assign jobs to technicians
    
    canViewCatalog: false,
    canEditCatalog: false,
    
    canManageSettings: false,
    canManageTeam: false,
    canInviteMembers: false,
    canChangeRoles: false,
    
    canViewAllPayments: false,
    canTriggerInvoice: false,
    
    canDelete: false,
  },
  
  technician: {
    // Can only see assigned jobs
    canViewAllLeads: false,
    canViewOwnLeads: false,
    canCreateLeads: false,
    canEditLeads: false,
    canDeleteLeads: false,
    
    canViewAllQuotes: false,
    canViewOwnQuotes: false,
    canCreateQuotes: false,
    canEditQuotes: false,
    canSendQuotes: false,
    canDeleteQuotes: false,
    
    canViewAllJobs: false,
    canViewAssignedJobs: true,
    canStartJobs: true,
    canCompleteJobs: true,
    canAssignJobs: false,
    
    canViewFullCalendar: false, // Only sees their own schedule
    canEditCalendar: false,
    canScheduleJobs: false,
    
    canViewCatalog: false,
    canEditCatalog: false,
    
    canManageSettings: false,
    canManageTeam: false,
    canInviteMembers: false,
    canChangeRoles: false,
    
    canViewAllPayments: false,
    canTriggerInvoice: true, // Can trigger invoice after completion
    
    canDelete: false,
  },
}

/**
 * Get permissions for a role
 */
export function getPermissions(role: UserRole | null | undefined): RolePermissions {
  if (!role) return ROLE_PERMISSIONS.technician // Default to most restricted
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.technician
}

/**
 * Check if role has specific permission
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: keyof RolePermissions
): boolean {
  return getPermissions(role)[permission]
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner',
    office: 'Office / Scheduler',
    sales: 'Sales',
    technician: 'Technician',
  }
  return names[role]
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full access to all features and settings',
    office: 'Manage leads, quotes, calendar, and jobs',
    sales: 'Create and manage own leads and quotes',
    technician: 'View and complete assigned jobs',
  }
  return descriptions[role]
}

/**
 * Available tabs for each role
 */
export function getAvailableTabs(role: UserRole | null | undefined): string[] {
  const perms = getPermissions(role)
  
  const tabs: string[] = []
  
  // Work tab - everyone can see (filtered by permissions)
  tabs.push('work')
  
  // Leads & Quotes - not for technicians
  if (perms.canViewAllLeads || perms.canViewOwnLeads) {
    tabs.push('leads-quotes')
  }
  
  // Calendar - owner, office, sales can see
  if (perms.canViewFullCalendar) {
    tabs.push('calendar')
  }
  
  // Settings - owner only
  if (perms.canManageSettings) {
    tabs.push('settings')
  }
  
  return tabs
}

/**
 * Get default route for role
 */
export function getDefaultRoute(role: UserRole | null | undefined): string {
  const perms = getPermissions(role)
  
  // Technicians start on Work tab
  if (!perms.canViewAllLeads && !perms.canViewOwnLeads) {
    return '/work'
  }
  
  // Others start on Leads & Quotes
  return '/leads-and-quotes/leads'
}
