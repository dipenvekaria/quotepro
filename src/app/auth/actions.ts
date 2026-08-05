'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  // Best-effort global revoke; local cookie clearing happens regardless, so
  // sign-out still completes even if the auth server is unreachable.
  await supabase.auth.signOut().catch(() => {})
  redirect('/login')
}
