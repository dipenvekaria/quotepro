import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { AppShell } from '../_components/app-shell'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { userId, email, companyId, profile } = await requireSession()

  const companyRows = await query<{
    id: string
    name: string
    logo_url: string | null
    subscription_status: string | null
  }>(`select id, name, logo_url, subscription_status from companies where id = $1 limit 1`, [
    companyId,
  ])
  const company = companyRows[0] ?? null
  const readOnly = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(
    company?.subscription_status ?? '',
  )

  return (
    <AppShell
      user={{ id: userId, email }}
      profile={profile ?? {}}
      company={company}
      readOnly={readOnly}
    >
      {children}
    </AppShell>
  )
}
