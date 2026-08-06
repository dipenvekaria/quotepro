import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { AppShell } from '../_components/app-shell'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { userId, email, companyId, role, profile } = await requireSession()

  const companyRows = await query<{ id: string; name: string; logo_url: string | null }>(
    `select id, name, logo_url from companies where id = $1 limit 1`,
    [companyId],
  )
  const company = companyRows[0] ?? null

  return (
    <AppShell
      user={{ id: userId, email }}
      profile={profile ?? {}}
      role={role}
      company={company}
    >
      {children}
    </AppShell>
  )
}
