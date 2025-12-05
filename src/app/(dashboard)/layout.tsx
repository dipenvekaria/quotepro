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

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url, phone, email, address, settings, created_at, updated_at')
    .eq('id', (await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    ).data?.company_id)
    .single()

  if (!company) {
    redirect('/onboarding')
  }

  // Fetch all leads with customer data
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (leadsError) {
    console.error('Error fetching leads:', leadsError)
  }

  // Fetch all quotes with customer data and item counts
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers(*),
      lead:leads(id),
      quote_items(id)
    `)
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (quotesError) {
    console.error('Error fetching quotes:', quotesError)
  }

  // Combine leads and quotes for the dashboard context
  const allData = [
    ...(leads || []).map(lead => ({ ...lead, _type: 'lead' })),
    ...(quotes || []).map(quote => ({ ...quote, _type: 'quote' }))
  ]

  return (
    <QueryProvider>
      <DashboardProvider company={company} quotes={allData}>
        <div className="min-h-screen min-h-[100dvh] bg-gray-50">
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
        </div>
      </DashboardProvider>
    </QueryProvider>
  )
}
