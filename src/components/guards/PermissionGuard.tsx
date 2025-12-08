/**
 * Permission-based component wrapper
 * Hides children if user doesn't have required permission
 */

'use client'

import { useUserRole } from '@/hooks/use-user-role'
import { RolePermissions } from '@/lib/permissions'
import { ReactNode } from 'react'

interface PermissionGuardProps {
  children: ReactNode
  permission: keyof RolePermissions
  fallback?: ReactNode
}

export function PermissionGuard({ children, permission, fallback = null }: PermissionGuardProps) {
  const { permissions, loading } = useUserRole()

  // While loading or if permissions not loaded, hide the component
  if (loading || !permissions) {
    return null
  }

  // Check if user has the required permission
  if (!permissions[permission]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Role-based component wrapper
 * Only shows children for specific roles
 */
interface RoleGuardProps {
  children: ReactNode
  allowedRoles: ('owner' | 'office' | 'sales' | 'technician')[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { role, loading } = useUserRole()

  if (loading) {
    return null
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
