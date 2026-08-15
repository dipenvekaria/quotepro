'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query, withTransaction } from '@/lib/db'

/**
 * Customers could only be created as a side effect of writing a quote. That is
 * the common path, but a contractor who has just taken a call and wants the
 * details down before they forget had nowhere to put them.
 */

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('That email does not look right').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  // Set only when the address came from autocomplete.
  city: z.string().trim().max(120).optional().or(z.literal('')),
  state: z.string().trim().max(40).optional().or(z.literal('')),
  zip: z.string().trim().max(20).optional().or(z.literal('')),
})

export type NewCustomerInput = z.infer<typeof schema>

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export async function createCustomer(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session
  const { name, email, phone, address, city, state, zip } = parsed.data

  // Same matching rule create_work_item_with_customer uses, so adding someone
  // here and quoting them later lands on one record rather than two.
  if (email || phone) {
    const existing = await query<{ id: string; name: string }>(
      `select id, name from customers
        where company_id = $1
          and ( ($2 <> '' and phone = $2)
             or ($3 <> '' and lower(email) = lower($3)) )
        limit 1`,
      [companyId, phone ?? '', email ?? ''],
    )
    if (existing[0]) {
      return { ok: false, error: `${existing[0].name} already has that phone or email.` }
    }
  }

  let id: string | undefined
  try {
    id = await withTransaction(async (q) => {
      const rows = await q<{ id: string }>(
        `insert into customers (company_id, name, email, phone)
         values ($1, $2, $3, $4)
         returning id`,
        [companyId, name, email || null, phone || null],
      )
      const customerId = rows[0]?.id
      if (customerId && address) {
        await q(
          `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
           values ($1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), true)`,
          [customerId, address, city ?? '', state ?? '', zip ?? ''],
        )
      }
      return customerId
    })
  } catch (e) {
    console.error('createCustomer failed', e)
    return { ok: false, error: 'Could not save that customer. Please try again.' }
  }

  if (!id) return { ok: false, error: 'Could not save that customer.' }

  revalidatePath('/app/customers')
  return { ok: true, data: { id } }
}

// ---------------------------------------------------------------------------

/**
 * Correcting a customer's details.
 *
 * Until this existed a customer could be created and never changed, so a phone
 * number taken down wrong over a noisy line stayed wrong forever — and the
 * quote it was attached to never reached anyone.
 *
 * The address is the customer's primary one. Editing it updates that row rather
 * than adding another, because the common case by far is fixing a typo, not
 * recording a second property.
 */
const updateSchema = schema.extend({ id: z.string().uuid() })

export type UpdateCustomerInput = z.infer<typeof updateSchema>

export async function updateCustomer(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session

  const { id, name, email, phone, address, city, state, zip } = parsed.data

  try {
    await withTransaction(async (q) => {
      // The company predicate is the tenancy check: a customer id from another
      // company updates nothing rather than being edited.
      const owned = await q<{ id: string }>(
        `update customers
            set name = $1, email = nullif($2, ''), phone = nullif($3, ''), updated_at = now()
          where id = $4 and company_id = $5
          returning id`,
        [name, email ?? '', phone ?? '', id, companyId],
      )
      if (owned.length === 0) throw new Error('NOT_FOUND')

      if (!address) return

      const [primary] = await q<{ id: string }>(
        `select id from customer_addresses
          where customer_id = $1 order by is_primary desc, created_at limit 1`,
        [id],
      )

      if (primary) {
        await q(
          `update customer_addresses
              set address = $2, city = nullif($3, ''), state = nullif($4, ''), zip = nullif($5, '')
            where id = $1`,
          [primary.id, address, city ?? '', state ?? '', zip ?? ''],
        )
      } else {
        await q(
          `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
           values ($1, $2, nullif($3, ''), nullif($4, ''), nullif($5, ''), true)`,
          [id, address, city ?? '', state ?? '', zip ?? ''],
        )
      }
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return { ok: false, error: 'Customer not found' }
    }
    // Phone and email are unique per company. "Please try again" is useless
    // advice for a collision — retrying does the same thing forever — so say
    // which field clashed and let them go and merge the two records.
    const constraint = (e as { constraint?: string } | null)?.constraint
    if (constraint === 'customers_unique_phone_per_company') {
      return { ok: false, error: 'Another customer already has that phone number.' }
    }
    if (constraint === 'customers_unique_email_per_company') {
      return { ok: false, error: 'Another customer already has that email address.' }
    }
    console.error('updateCustomer failed', e)
    return { ok: false, error: 'Could not save those changes. Please try again.' }
  }

  revalidatePath('/app/customers')
  revalidatePath(`/app/customers/${id}`)
  return { ok: true, data: { id } }
}
