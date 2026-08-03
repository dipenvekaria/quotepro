import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { AppShell } from '../_components/app-shell'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, profile')
    .eq('id', user.id)
    .maybeSingle()

  // No company yet → onboarding takes over.
  if (!profile?.company_id) redirect('/app/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .eq('id', profile.company_id)
    .maybeSingle()

  return (
    <AppShell
      user={{ id: user.id, email: user.email ?? '' }}
      profile={(profile.profile as Record<string, unknown>) ?? {}}
      role={(profile.role as string) ?? 'owner'}
      company={company ? { id: company.id, name: company.name, logo_url: company.logo_url } : null}
    >
      {children}
    </AppShell>
  )
}
