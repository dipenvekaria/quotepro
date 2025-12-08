import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  const code = params.code

  // If there's an OAuth code, handle the callback
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check team_members table for company_id
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('company_id')
          .eq('user_id', user.id)
          .single() as { data: { company_id: string } | null }

        // Redirect to onboarding if new user, home if returning
        redirect(teamMember?.company_id ? '/home' : '/onboarding')
      }
    }
  }

  // Default: redirect to login
  redirect('/login')
}

