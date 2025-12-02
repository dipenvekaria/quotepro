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
        // NEW SCHEMA: Check users table for company_id
        const { data: userRecord } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single() as { data: { company_id: string } | null }

        // Redirect to onboarding if new user, home if returning
        redirect(userRecord?.company_id ? '/home' : '/onboarding')
      }
    }
  }

  // Default: redirect to login
  redirect('/login')
}

