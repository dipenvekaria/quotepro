// @ts-nocheck - New lead_status column pending database migration
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeadsAndQuotes } from '@/components/leads-and-quotes'

export default async function LeadsPage() {
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

  // Fetch all quotes/leads for this company
  const { data: allRecords } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const records = allRecords || []

  // Split into leads and quotes based on lead_status
  const leads = records.filter(r => 
    ['new', 'contacted', 'quote_visit_scheduled'].includes(r.lead_status)
  )
  
  const quotes = records.filter(r => 
    ['quoted', 'signed', 'lost'].includes(r.lead_status)
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads & Quotes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your sales pipeline from first contact to signed quote
              </p>
            </div>
            {company.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-12 w-auto object-contain"
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadsAndQuotes 
          leads={leads} 
          quotes={quotes} 
          companyId={company.id}
        />
      </main>
    </div>
  )
}
