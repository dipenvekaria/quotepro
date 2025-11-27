import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PaymentsContent } from '@/components/payments-content'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's company_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    redirect('/onboarding')
  }

  return <PaymentsContent companyId={profile.company_id} />
}
