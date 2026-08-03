'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { sendInvoiceEmail } from '@/lib/email/senders'
import { sbServer } from '@/lib/supabase/untyped'

// ---------------------------------------------------------------------------

type InvoiceStub = { id: string; public_token: string; invoice_number: string }

export async function convertToInvoice(
  workItemId: string,
): Promise<{ ok: true; data: InvoiceStub } | { ok: false; error: string }> {
  const supabase = await sbServer()

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, public_token, invoice_number')
    .eq('work_item_id', workItemId)
    .maybeSingle()
  if (existing) return { ok: true, data: existing as InvoiceStub }

  const { data: work, error: workErr } = await supabase
    .from('work_items')
    .select('id, company_id, customer_id, subtotal, tax_amount, total, invoice_number')
    .eq('id', workItemId)
    .maybeSingle()
  if (workErr) return { ok: false, error: workErr.message }
  if (!work) return { ok: false, error: 'Work item not found' }

  const invoiceNumber =
    work.invoice_number ??
    `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`

  const due = new Date()
  due.setDate(due.getDate() + 14)

  const { data: created, error: insErr } = await supabase
    .from('invoices')
    .insert({
      company_id: work.company_id,
      work_item_id: work.id,
      customer_id: work.customer_id,
      invoice_number: invoiceNumber,
      subtotal: work.subtotal,
      tax_amount: work.tax_amount,
      total: work.total,
      amount_paid: 0,
      status: 'draft',
      due_date: due.toISOString().slice(0, 10),
    })
    .select('id, public_token, invoice_number')
    .single()

  if (insErr) return { ok: false, error: insErr.message }
  if (!created) return { ok: false, error: 'Insert returned no row' }

  await supabase.from('work_items').update({ invoice_number: invoiceNumber }).eq('id', work.id)

  revalidatePath(`/app/pipeline/${workItemId}`)
  return { ok: true, data: created as InvoiceStub }
}

// ---------------------------------------------------------------------------

type SendInvoiceResult =
  | { ok: true; data: { public_token: string; email: 'sent' | 'skipped' | 'error' } }
  | { ok: false; error: string }

export async function sendInvoice(invoiceId: string): Promise<SendInvoiceResult> {
  const supabase = await sbServer()

  const { data: inv, error: fetchErr } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total, amount_paid, status, sent_at, due_date, public_token,
      customers (name, email),
      companies (name, email)
    `)
    .eq('id', invoiceId)
    .maybeSingle()
  if (fetchErr) return { ok: false, error: fetchErr.message }
  if (!inv) return { ok: false, error: 'Not found' }

  const now = new Date().toISOString()
  await supabase
    .from('invoices')
    .update({
      status: inv.status === 'draft' ? 'sent' : inv.status,
      sent_at: inv.sent_at ?? now,
    })
    .eq('id', inv.id)

  let emailResult: 'sent' | 'skipped' | 'error' = 'skipped'
  const cust = inv.customers as { name: string; email: string | null } | null
  const comp = inv.companies as { name: string; email: string | null } | null
  if (cust?.email) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${inv.public_token}`
    try {
      const res = await sendInvoiceEmail({
        to: cust.email,
        customerName: cust.name,
        invoiceNumber: inv.invoice_number,
        amountDue: Number(inv.total) - Number(inv.amount_paid ?? 0),
        publicUrl,
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        fromLabel: comp?.name,
        replyTo: comp?.email ?? undefined,
      })
      emailResult = res.ok && !('skipped' in res && res.skipped) ? 'sent' : res.ok ? 'skipped' : 'error'
    } catch {
      emailResult = 'error'
    }
  }

  revalidatePath(`/app/pipeline`)
  return { ok: true, data: { public_token: inv.public_token as string, email: emailResult } }
}

// ---------------------------------------------------------------------------

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'check', 'card', 'bank_transfer', 'stripe']),
  reference_number: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export type RecordPaymentInput = z.infer<typeof paymentSchema>

export async function recordPayment(input: RecordPaymentInput) {
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await sbServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, work_item_id')
    .eq('id', parsed.data.invoice_id)
    .maybeSingle()
  if (!inv) return { ok: false as const, error: 'Invoice not found' }

  const { error: payErr } = await supabase.from('payments').insert({
    invoice_id: parsed.data.invoice_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference_number: parsed.data.reference_number ?? null,
    notes: parsed.data.notes ?? null,
    recorded_by: user.id,
  })
  if (payErr) return { ok: false as const, error: payErr.message }

  const newPaid = Number(inv.amount_paid ?? 0) + parsed.data.amount
  const total = Number(inv.total)
  const newStatus: 'paid' | 'partial' = newPaid >= total ? 'paid' : 'partial'

  const invPatch: Record<string, unknown> = {
    amount_paid: newPaid,
    status: newStatus,
  }
  if (newStatus === 'paid') invPatch.paid_at = new Date().toISOString()

  await supabase.from('invoices').update(invPatch).eq('id', inv.id)

  revalidatePath(`/app/pipeline`)
  if (inv.work_item_id) revalidatePath(`/app/pipeline/${inv.work_item_id}`)
  return { ok: true as const, data: { newPaid, newStatus } }
}
