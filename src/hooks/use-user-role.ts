'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { UserRole, getPermissions, RolePermissions } from '@/lib/permissions'

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<RolePermissions>(getPermissions(null))

  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Check team_members table for role
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role, company_id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { role: UserRole; company_id: string } | null; error: any }

      if (teamMember) {
        setRole(teamMember.role)
        setCompanyId(teamMember.company_id)
        setPermissions(getPermissions(teamMember.role))
      }

      setLoading(false)
    }

    fetchUserRole()
  }, [])

  return { role, loading, companyId, permissions }
}
