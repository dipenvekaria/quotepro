'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { logActivity } from '@/lib/activity'
import { sendInvoiceEmail } from '@/lib/email/senders'
import { getSession } from '@/lib/auth/session'
import { query, withTransaction } from '@/lib/db'

// ---------------------------------------------------------------------------

type InvoiceStub = { id: string; public_token: string; invoice_number: string }

export async function convertToInvoice(
  workItemId: string,
): Promise<{ ok: true; data: InvoiceStub } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session

  const [existing] = await query<InvoiceStub>(
    `select id, public_token, invoice_number from invoices
      where work_item_id = $1 and company_id = $2 limit 1`,
    [workItemId, companyId],
  )
  if (existing) return { ok: true, data: existing }

  const [work] = await query<{
    id: string
    company_id: string
    customer_id: string | null
    subtotal: number | null
    tax_amount: number | null
    total: number | null
    invoice_number: string | null
  }>(
    `select id, company_id, customer_id, subtotal, tax_amount, total, invoice_number
       from work_items where id = $1 and company_id = $2 limit 1`,
    [workItemId, companyId],
  )
  if (!work) return { ok: false, error: 'Work item not found' }

  const invoiceNumber =
    work.invoice_number ??
    `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`

  const due = new Date()
  due.setDate(due.getDate() + 14)

  let created: InvoiceStub | undefined
  try {
    created = await withTransaction(async (q) => {
      const rows = await q<InvoiceStub>(
        `insert into invoices
           (company_id, work_item_id, customer_id, invoice_number, subtotal, tax_amount, total, amount_paid, status, due_date)
         values ($1, $2, $3, $4, $5, $6, $7, 0, 'draft'::invoice_status, $8)
         returning id, public_token, invoice_number`,
        [
          work.company_id,
          work.id,
          work.customer_id,
          invoiceNumber,
          work.subtotal,
          work.tax_amount,
          work.total,
          due.toISOString().slice(0, 10),
        ],
      )
      await q(`update work_items set invoice_number = $1 where id = $2`, [invoiceNumber, work.id])
      return rows[0]
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create invoice' }
  }
  if (!created) return { ok: false, error: 'Insert returned no row' }

  await logActivity({
    companyId,
    userId: session.userId,
    entityId: work.id,
    action: 'invoice_created',
    description: `Invoice ${created.invoice_number} created`,
    changes: { invoice_number: created.invoice_number, total: work.total },
  })

  revalidatePath(`/app/pipeline/${workItemId}`)
  return { ok: true, data: created }
}

// ---------------------------------------------------------------------------

type SendInvoiceResult =
  | { ok: true; data: { public_token: string; email: 'sent' | 'skipped' | 'error' } }
  | { ok: false; error: string }

export async function sendInvoice(invoiceId: string): Promise<SendInvoiceResult> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session

  const [inv] = await query<{
    id: string
    invoice_number: string
    total: number | null
    amount_paid: number | null
    status: string
    sent_at: string | null
    due_date: string | null
    public_token: string
    work_item_id: string | null
    customer_name: string | null
    customer_email: string | null
    company_name: string | null
    company_email: string | null
  }>(
    `select i.id, i.invoice_number, i.total, i.amount_paid, i.status, i.sent_at, i.due_date, i.public_token,
            i.work_item_id,
            c.name as customer_name, c.email as customer_email,
            co.name as company_name, co.email as company_email
       from invoices i
       left join customers c on c.id = i.customer_id
       left join companies co on co.id = i.company_id
      where i.id = $1 and i.company_id = $2
      limit 1`,
    [invoiceId, companyId],
  )
  if (!inv) return { ok: false, error: 'Not found' }

  const now = new Date().toISOString()
  await query(
    `update invoices
        set status = case when status = 'draft' then 'sent'::invoice_status else status end,
            sent_at = coalesce(sent_at, $2)
      where id = $1 and company_id = $3`,
    [inv.id, now, companyId],
  )

  let emailResult: 'sent' | 'skipped' | 'error' = 'skipped'
  if (inv.customer_email) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/i/${inv.public_token}`
    try {
      const res = await sendInvoiceEmail({
        to: inv.customer_email,
        customerName: inv.customer_name ?? '',
        invoiceNumber: inv.invoice_number,
        amountDue: Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0),
        publicUrl,
        dueDate: inv.due_date ? new Date(inv.due_date) : null,
        fromLabel: inv.company_name ?? undefined,
        replyTo: inv.company_email ?? undefined,
      })
      emailResult = res.ok && !('skipped' in res && res.skipped) ? 'sent' : res.ok ? 'skipped' : 'error'
    } catch {
      emailResult = 'error'
    }
  }

  if (inv.work_item_id) {
    await logActivity({
      companyId,
      userId: session.userId,
      entityId: inv.work_item_id,
      action: 'invoice_sent',
      description: `Invoice ${inv.invoice_number} sent`,
      changes: { email: emailResult },
    })
  }

  revalidatePath(`/app/pipeline`)
  return { ok: true, data: { public_token: inv.public_token, email: emailResult } }
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

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  const { userId, companyId } = session

  const [inv] = await query<{
    id: string
    total: number | null
    amount_paid: number | null
    work_item_id: string | null
  }>(
    `select id, total, amount_paid, work_item_id from invoices
      where id = $1 and company_id = $2 limit 1`,
    [parsed.data.invoice_id, companyId],
  )
  if (!inv) return { ok: false as const, error: 'Invoice not found' }

  const newPaid = Number(inv.amount_paid ?? 0) + parsed.data.amount
  const total = Number(inv.total ?? 0)
  const newStatus: 'paid' | 'partial' = newPaid >= total ? 'paid' : 'partial'

  try {
    await withTransaction(async (q) => {
      await q(
        `insert into payments (invoice_id, amount, method, reference_number, notes, recorded_by)
         values ($1, $2, $3::payment_method, $4, $5, $6)`,
        [
          parsed.data.invoice_id,
          parsed.data.amount,
          parsed.data.method,
          parsed.data.reference_number ?? null,
          parsed.data.notes ?? null,
          userId,
        ],
      )
      if (newStatus === 'paid') {
        await q(
          `update invoices set amount_paid = $1, status = 'paid'::invoice_status, paid_at = $2 where id = $3`,
          [newPaid, new Date().toISOString(), inv.id],
        )
      } else {
        await q(
          `update invoices set amount_paid = $1, status = 'partial'::invoice_status where id = $2`,
          [newPaid, inv.id],
        )
      }
    })
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to record payment' }
  }

  if (inv.work_item_id) {
    await logActivity({
      companyId,
      userId,
      entityId: inv.work_item_id,
      action: 'payment_recorded',
      description: `Payment of $${parsed.data.amount.toFixed(2)} recorded (${parsed.data.method})`,
      changes: { amount: parsed.data.amount, method: parsed.data.method, status: newStatus },
    })
  }

  revalidatePath(`/app/pipeline`)
  if (inv.work_item_id) revalidatePath(`/app/pipeline/${inv.work_item_id}`)
  return { ok: true as const, data: { newPaid, newStatus } }
}
