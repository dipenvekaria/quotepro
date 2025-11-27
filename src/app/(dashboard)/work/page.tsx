// @ts-nocheck - Supabase type generation pending
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkCalendar } from '@/components/work-calendar-simple'

export default async function WorkPage() {
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

  // Fetch all quotes for work management
  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const quotes = allQuotes || []

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkCalendar quotes={quotes} />
      </main>
    </div>
  )
}
