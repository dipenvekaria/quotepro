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
        // @ts-ignore - Supabase typing
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single()

        // Redirect to onboarding if new user, dashboard if returning
        redirect(company ? '/dashboard' : '/onboarding')
      }
    }
  }

  // Default: redirect to login
  redirect('/login')
}

