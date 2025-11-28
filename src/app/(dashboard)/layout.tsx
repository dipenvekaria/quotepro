// @ts-nocheck - Supabase type generation pending
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNavigation } from '@/components/dashboard-navigation'
import { DashboardProvider } from '@/lib/dashboard-context'

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
    .select('id, name, logo_url, phone, email, address, tax_rate, user_id, created_at, updated_at')
    .eq('user_id', user.id)
    .single()

  if (!company) {
    redirect('/onboarding')
  }

  // Fetch all quotes once at layout level
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (quotesError) {
    console.error('Error fetching quotes:', quotesError)
  }

  return (
    <DashboardProvider company={company} quotes={quotes || []}>
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
    </DashboardProvider>
  )
}
