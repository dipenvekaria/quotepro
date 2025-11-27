// @ts-nocheck - Supabase type generation pending
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNavigation } from '@/components/dashboard-navigation'

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

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!company) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <DashboardNavigation companyId={company.id} />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <main className="pb-20 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
