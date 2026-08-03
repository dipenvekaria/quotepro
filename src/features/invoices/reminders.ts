'use server'

import { revalidatePath } from 'next/cache'

import { env } from '@/lib/env'
import { sendInvoiceEmail } from '@/lib/email/senders'
import { sbServer } from '@/lib/supabase/untyped'

// ---------------------------------------------------------------------------

/**
 * Find every open invoice that's past due for the caller's company and re-send
 * the reminder email. Idempotent — a `last_reminder_at` cache in metadata would
 * be a future refinement.
 */
export async function sendOverdueReminders() {
  const supabase = await sbServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) return { ok: false as const, error: 'No company' }

  const today = new Date().toISOString().slice(0, 10)

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total, amount_paid, due_date, public_token,
      customers (name, email),
      companies (name, email)
    `)
    .eq('company_id', profile.company_id)
    .in('status', ['sent', 'partial', 'overdue'])
    .lt('due_date', today)
    .limit(50)

  if (!invoices?.length) {
    return { ok: true as const, data: { count: 0, sent: 0, skipped: 0 } }
  }

  let sent = 0
  let skipped = 0
  for (const inv of invoices) {
    const cust = inv.customers as { name: string; email: string | null } | null
    const comp = inv.companies as { name: string; email: string | null } | null
    if (!cust?.email) {
      skipped += 1
      continue
    }
    const amountDue = Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0))
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${inv.public_token}`
    try {
      const res = await sendInvoiceEmail({
        to: cust.email,
        customerName: cust.name,
        invoiceNumber: `${inv.invoice_number} (reminder)`,
        amountDue,
        publicUrl,
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        fromLabel: comp?.name,
        replyTo: comp?.email ?? undefined,
      })
      if (res.ok && !('skipped' in res && res.skipped)) sent += 1
      else skipped += 1
    } catch {
      skipped += 1
    }
  }

  await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('company_id', profile.company_id)
    .in('status', ['sent', 'partial'])
    .lt('due_date', today)

  revalidatePath('/app/dashboard')
  return { ok: true as const, data: { count: invoices.length, sent, skipped } }
}
