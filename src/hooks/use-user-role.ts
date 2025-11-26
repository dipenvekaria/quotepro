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

      // First, check if user owns a company (they're always admin)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (company && !companyError) {
        setRole('admin')
        setCompanyId(company.id)
        setLoading(false)
        return
      }

      // If not owner, check team_members table for their role
      const { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('role, company_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (teamMember && !teamError) {
        setRole(teamMember.role as UserRole)
        setCompanyId(teamMember.company_id)
      }

      setLoading(false)
    }

    fetchUserRole()
  }, [])

  return { role, loading, companyId }
}
