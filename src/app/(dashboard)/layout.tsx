// @ts-nocheck - Supabase type generation pending
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavigationWrapper } from '@/components/navigation/navigation-wrapper'
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
        <NavigationWrapper>
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </NavigationWrapper>
      </div>
    </DashboardProvider>
  )
}
