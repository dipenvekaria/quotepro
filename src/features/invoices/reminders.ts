'use server'

import { revalidatePath } from 'next/cache'

import { env } from '@/lib/env'
import { sendInvoiceEmail } from '@/lib/email/senders'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

// ---------------------------------------------------------------------------

/**
 * Find every open invoice that's past due for the caller's company and re-send
 * the reminder email. Idempotent — a `last_reminder_at` cache in metadata would
 * be a future refinement.
 */
export async function sendOverdueReminders() {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { companyId } = session

  const today = new Date().toISOString().slice(0, 10)

  const invoices = await query<{
    id: string
    invoice_number: string
    total: number | null
    amount_paid: number | null
    due_date: string | null
    public_token: string
    customer_name: string | null
    customer_email: string | null
    company_name: string | null
    company_email: string | null
  }>(
    `select i.id, i.invoice_number, i.total, i.amount_paid, i.due_date, i.public_token,
            c.name as customer_name, c.email as customer_email,
            co.name as company_name, co.email as company_email
       from invoices i
       left join customers c on c.id = i.customer_id
       left join companies co on co.id = i.company_id
      where i.company_id = $1
        and i.status::text = any($2::text[])
        and i.due_date < $3
      order by i.due_date asc
      limit 50`,
    [companyId, ['sent', 'partial', 'overdue'], today],
  )

  if (!invoices.length) {
    return { ok: true as const, data: { count: 0, sent: 0, skipped: 0 } }
  }

  let sent = 0
  let skipped = 0
  for (const inv of invoices) {
    if (!inv.customer_email) {
      skipped += 1
      continue
    }
    const amountDue = Math.max(0, Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0))
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${inv.public_token}`
    try {
      const res = await sendInvoiceEmail({
        to: inv.customer_email,
        customerName: inv.customer_name ?? '',
        invoiceNumber: `${inv.invoice_number} (reminder)`,
        amountDue,
        publicUrl,
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        fromLabel: inv.company_name ?? undefined,
        replyTo: inv.company_email ?? undefined,
      })
      if (res.ok && !('skipped' in res && res.skipped)) sent += 1
      else skipped += 1
    } catch {
      skipped += 1
    }
  }

  await query(
    `update invoices set status = 'overdue'::invoice_status
      where company_id = $1 and status::text = any($2::text[]) and due_date < $3`,
    [companyId, ['sent', 'partial'], today],
  )

  revalidatePath('/app/dashboard')
  return { ok: true as const, data: { count: invoices.length, sent, skipped } }
}
