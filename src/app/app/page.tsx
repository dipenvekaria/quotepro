import { redirect } from 'next/navigation'

import { requireSession } from '@/lib/auth/session'

export default async function AppIndex() {
  await requireSession()
  redirect('/app/dashboard')
}
