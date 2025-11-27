// @ts-nocheck - Supabase type generation pending
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HomeDashboard } from '@/components/home-dashboard'

export default async function HomePage() {
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

  // Fetch all quotes for the dashboard in a single query
  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const quotes = allQuotes || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back{company.company_name ? `, ${company.company_name}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's happening today
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HomeDashboard quotes={quotes} companyId={company.id} />
      </main>
    </div>
  )
}
