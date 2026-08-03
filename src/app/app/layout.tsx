import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// The `/app/(shell)` route group provides the sidebar for logged-in users with
// a company. Onboarding lives outside this shell.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
