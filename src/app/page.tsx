import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  const code = params.code

  const supabase = await createClient()

  // Handle OAuth code exchange if present.
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/app')
  redirect('/login')
}
