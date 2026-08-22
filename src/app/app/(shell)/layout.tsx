import { requireSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

import { AppShell } from '../_components/app-shell'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { userId, email, companyId, profile } = await requireSession()

  // The shell wraps every signed-in page — its queries ride one wave.
  const [companyRows, unreadRows] = await Promise.all([
    query<{
      id: string
      name: string
      logo_url: string | null
      subscription_status: string | null
      complimentary: boolean
    }>(`select id, name, logo_url, subscription_status, complimentary from companies where id = $1 limit 1`, [
      companyId,
    ]),
    query<{ n: number }>(
      `select count(*)::int as n from notifications
        where user_id = $1 and company_id = $2 and read_at is null`,
      [userId, companyId],
    ),
  ])
  const company = companyRows[0] ?? null
  const unreadRow = unreadRows[0]
  const readOnly =
    !company?.complimentary &&
    ['canceled', 'past_due', 'unpaid', 'incomplete_expired'].includes(
      company?.subscription_status ?? '',
    )

  return (
    <AppShell
      user={{ id: userId, email }}
      profile={profile ?? {}}
      company={company}
      readOnly={readOnly}
      unreadNotifications={unreadRow?.n ?? 0}
    >
      {children}
    </AppShell>
  )
}
