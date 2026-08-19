'use server'

import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query, withTransaction } from '@/lib/db'
import { parseCsv } from '@/lib/csv'
import { Type } from '@google/genai'

/**
 * The switching wizard's engine: take whatever customer export a competitor
 * produces and land it in Rivet without the contractor mapping a single
 * column. Deterministic header maps cover the known exports (Jobber and
 * Housecall Pro ship stable headers); the AI reads the header row only —
 * never customer data — when the file is something else. Import dedupes the
 * same way quoting does, on email or phone, so re-running a file is safe.
 */

export type CustomerField =
  | 'first_name'
  | 'last_name'
  | 'name'
  | 'company'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'ignore'

const FIELD_VALUES: CustomerField[] = [
  'first_name', 'last_name', 'name', 'company', 'email', 'phone',
  'address', 'city', 'state', 'zip', 'ignore',
]

/** Header-token synonyms, checked lowercased with spaces/underscores squashed. */
const SYNONYMS: Record<string, CustomerField> = {
  firstname: 'first_name',
  lastname: 'last_name',
  name: 'name',
  fullname: 'name',
  clientname: 'name',
  customername: 'name',
  companyname: 'company',
  company: 'company',
  business: 'company',
  email: 'email',
  emailaddress: 'email',
  mainemail: 'email',
  phone: 'phone',
  phonenumber: 'phone',
  mobilephone: 'phone',
  mobile: 'phone',
  cellphone: 'phone',
  homephone: 'phone',
  mainphone: 'phone',
  address: 'address',
  street: 'address',
  street1: 'address',
  addressline1: 'address',
  billingaddress: 'address',
  serviceaddress: 'address',
  city: 'city',
  state: 'state',
  province: 'state',
  zip: 'zip',
  zipcode: 'zip',
  postalcode: 'zip',
  postal: 'zip',
}

function squash(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function deterministicMap(headers: string[]): (CustomerField | null)[] {
  const taken = new Set<CustomerField>()
  return headers.map((h) => {
    const f = SYNONYMS[squash(h)] ?? null
    // First match wins per field, so "Home Phone" after "Mobile Phone" is
    // ignored rather than overwriting the better number.
    if (!f || (f !== 'ignore' && taken.has(f))) return null
    if (f !== 'ignore') taken.add(f)
    return f
  })
}

export type MappingResult = {
  headers: string[]
  mapping: (CustomerField | null)[]
  mappedBy: 'headers' | 'ai'
  preview: Record<string, string>[]
  total: number
}

export async function mapCustomerCsv(input: { csv: string }): Promise<
  { ok: true; data: MappingResult } | { ok: false; error: string }
> {
  const parsed = z.object({ csv: z.string().min(1).max(5_000_000) }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That file looks empty or too large.' }
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }

  const rows = parseCsv(parsed.data.csv)
  if (rows.length < 2) return { ok: false, error: 'The file needs a header row and at least one customer.' }

  const headers = rows[0]
  let mapping = deterministicMap(headers)
  let mappedBy: 'headers' | 'ai' = 'headers'

  const hasIdentity = mapping.some((f) => f === 'name' || f === 'first_name' || f === 'company')
  if (!hasIdentity) {
    // Unknown export shape. The model sees the header row only — column
    // names, never customer rows.
    try {
      const { generateJson } = await import('@/lib/ai/gemini')
      const out = await generateJson({
        system:
          'You map CSV column headers from a field-service app export to a fixed set of customer fields. ' +
          'Reply with one field per header, in order. Use "ignore" for anything that is not one of the fields.',
        contents: `Headers: ${JSON.stringify(headers)}\nFields: ${FIELD_VALUES.join(', ')}`,
        schema: {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: { type: Type.STRING, enum: FIELD_VALUES as unknown as string[] },
            },
          },
          required: ['fields'],
        },
        temperature: 0,
      })
      const fields = (out as { fields?: string[] }).fields ?? []
      if (fields.length === headers.length) {
        const taken = new Set<CustomerField>()
        mapping = fields.map((f) => {
          const v = FIELD_VALUES.includes(f as CustomerField) ? (f as CustomerField) : null
          if (!v || v === 'ignore' || taken.has(v)) return v === 'ignore' ? null : null
          taken.add(v)
          return v
        })
        mappedBy = 'ai'
      }
    } catch (e) {
      console.error('import: ai header mapping failed', e)
    }
  }

  if (!mapping.some((f) => f === 'name' || f === 'first_name' || f === 'company')) {
    return {
      ok: false,
      error:
        'Could not find a name column. The file needs a customer name (or first/last name) column.',
    }
  }

  const preview = rows.slice(1, 6).map((r) => {
    const rec: Record<string, string> = {}
    mapping.forEach((f, i) => {
      if (f && f !== 'ignore' && r[i]) rec[f] = r[i]
    })
    return rec
  })

  return { ok: true, data: { headers, mapping, mappedBy, preview, total: rows.length - 1 } }
}

const importSchema = z.object({
  csv: z.string().min(1).max(5_000_000),
  mapping: z.array(z.enum(FIELD_VALUES as [CustomerField, ...CustomerField[]]).nullable()),
})

export type ImportSummary = { imported: number; merged: number; skipped: number }

export async function importCustomers(input: {
  csv: string
  mapping: (CustomerField | null)[]
}): Promise<{ ok: true; data: ImportSummary } | { ok: false; error: string }> {
  const parsed = importSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid import payload' }
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not authenticated' }
  const { companyId } = session

  const rows = parseCsv(parsed.data.csv).slice(1)
  if (rows.length === 0) return { ok: false, error: 'No customer rows found.' }
  if (rows.length > 10_000) return { ok: false, error: 'That is over 10,000 rows — split the file.' }

  const mapping = parsed.data.mapping
  let imported = 0
  let merged = 0
  let skipped = 0

  for (const r of rows) {
    const rec: Partial<Record<CustomerField, string>> = {}
    mapping.forEach((f, i) => {
      if (f && f !== 'ignore' && r[i]?.trim()) rec[f] = r[i].trim()
    })

    const name =
      rec.name ??
      [rec.first_name, rec.last_name].filter(Boolean).join(' ').trim() ??
      rec.company
    const displayName = (name && name.length > 0 ? name : rec.company)?.slice(0, 200)
    if (!displayName) {
      skipped += 1
      continue
    }
    const email = rec.email?.toLowerCase().slice(0, 254) ?? null
    const phone = rec.phone?.slice(0, 40) ?? null

    try {
      // Same identity rule the quoting flow uses: an email or phone match is
      // the same person, so a re-run of the file merges instead of duplicating.
      if (email || phone) {
        const existing = await query<{ id: string }>(
          `select id from customers
            where company_id = $1
              and ((\$2::text is not null and lower(email) = $2) or (\$3::text is not null and phone = $3))
            limit 1`,
          [companyId, email, phone],
        )
        if (existing[0]) {
          merged += 1
          continue
        }
      }

      await withTransaction(async (q) => {
        const [c] = await q<{ id: string }>(
          `insert into customers (company_id, name, email, phone)
           values ($1, $2, $3, $4) returning id`,
          [companyId, displayName, email, phone],
        )
        if (rec.address || rec.city || rec.zip) {
          await q(
            `insert into customer_addresses (customer_id, address, city, state, zip, is_primary)
             values ($1, $2, $3, $4, $5, true)`,
            [c.id, rec.address ?? null, rec.city ?? null, rec.state ?? null, rec.zip ?? null],
          )
        }
      })
      imported += 1
    } catch (e) {
      console.error('import: row failed', e)
      skipped += 1
    }
  }

  return { ok: true, data: { imported, merged, skipped } }
}
