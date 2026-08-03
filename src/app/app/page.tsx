import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export default async function AppIndex() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.company_id) redirect('/app/onboarding')
  redirect('/app/dashboard')
}
