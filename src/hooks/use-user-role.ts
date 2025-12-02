'use client'

import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/roles'
import { useEffect, useState } from 'react'

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // NEW SCHEMA: Check users table for role and company_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle() as { data: { role: UserRole; company_id: string } | null; error: any }

      if (userRecord && !userError) {
        setRole(userRecord.role)
        setCompanyId(userRecord.company_id)
        setLoading(false)
        return
      }

      // Fallback: If not in users table, check team_members (for invited users)
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('role, company_id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { role: UserRole; company_id: string } | null; error: any }

      if (teamMember && !teamError) {
        setRole(teamMember.role)
        setCompanyId(teamMember.company_id)
      }

      setLoading(false)
    }

    fetchUserRole()
  }, [])

  return { role, loading, companyId }
}
