// @ts-nocheck - Supabase type generation pending
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavigationWrapper } from '@/components/navigation/navigation-wrapper'
import { DashboardProvider } from '@/lib/dashboard-context'
import { QueryProvider } from '@/lib/providers/QueryProvider'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's team membership
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) {
    redirect('/onboarding')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url, phone, email, address, settings, created_at, updated_at')
    .eq('id', teamMember.company_id)
    .single()

  if (!company) {
    redirect('/onboarding')
  }

  // Fetch all work items with customer data
  const { data: workItemsData, error: workItemsError } = await supabase
    .from('work_items')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('company_id', company.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (workItemsError) {
    console.error('Error fetching work_items:', workItemsError)
  }

  const workItems = workItemsData || []

  return (
    <QueryProvider>
      <DashboardProvider company={company} workItems={workItems}>
        <div className="min-h-screen min-h-[100dvh] bg-gray-50">
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </div>
      </DashboardProvider>
    </QueryProvider>
  )
}
