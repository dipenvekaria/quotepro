'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(30),
  // IANA zone; every server-side day boundary reads it. Validated as a real
  // zone below rather than by pattern — Intl is the authority on what exists.
  timezone: z.string().max(64),
  // Where "Request review" points the customer. Links, not OAuth: no API
  // exists for soliciting Google or Facebook reviews — every competitor's
  // review feature is these same links in an email.
  review_link_google: z.string().url().startsWith('https://').optional().or(z.literal('')),
  review_link_facebook: z.string().url().startsWith('https://').optional().or(z.literal('')),
  // The company's own fine print — warranty, deposits, cancellation. Renders
  // on the public quote, in the PDF, and the customer signs against it.
  quote_terms: z.string().max(20000).optional().or(z.literal('')),
  business_tax_id: z.string().max(60).optional().or(z.literal('')),
})

export type UpdateSettingsInput = z.infer<typeof settingsSchema>

export async function updateCompanySettings(input: UpdateSettingsInput) {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins can update settings' }
  }

  const [current] = await query<{ settings: Record<string, unknown> | null }>(
    'select settings from companies where id = $1 limit 1',
    [session.companyId],
  )
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: parsed.data.timezone })
  } catch {
    return { ok: false as const, error: 'That timezone is not recognised.' }
  }

  const currentSettings = (current?.settings ?? {}) as Record<string, unknown>
  const nextSettings = {
    ...currentSettings,
    tax_rate: parsed.data.tax_rate,
    timezone: parsed.data.timezone,
    review_link_google: parsed.data.review_link_google || null,
    review_link_facebook: parsed.data.review_link_facebook || null,
    quote_terms: parsed.data.quote_terms || null,
    business_tax_id: parsed.data.business_tax_id || null,
  }

  try {
    await query(
      `update companies
          set name = $1, phone = $2, email = $3, address = $4, settings = $5::jsonb
        where id = $6`,
      [
        parsed.data.name,
        parsed.data.phone || null,
        parsed.data.email || null,
        parsed.data.address || null,
        JSON.stringify(nextSettings),
        session.companyId,
      ],
    )
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Update failed' }
  }

  revalidatePath('/app/settings')
  revalidatePath('/app')
  return { ok: true as const }
}

// ---------------------------------------------------------------------------
// Working hours
//
// Slot suggestions are only honest if we know when this contractor works —
// without these, "next available" would happily offer 2am on a Sunday.
// ---------------------------------------------------------------------------

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const dayHoursSchema = z
  .object({ start: z.string().regex(HHMM, 'Use HH:MM'), end: z.string().regex(HHMM, 'Use HH:MM') })
  .nullable()
  .refine((v) => v === null || v.start < v.end, { message: 'The end has to be after the start' })

const businessHoursSchema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
})

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>

export async function updateBusinessHours(input: unknown) {
  const parsed = businessHoursSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid hours' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins can change working hours' }
  }

  const open = Object.values(parsed.data).filter(Boolean).length
  if (open === 0) {
    return { ok: false as const, error: 'Leave at least one day open, or nothing can be scheduled.' }
  }

  try {
    await query(`update companies set business_hours = $1::jsonb where id = $2`, [
      JSON.stringify(parsed.data),
      session.companyId,
    ])
  } catch (e) {
    console.error('updateBusinessHours failed', e)
    return { ok: false as const, error: 'Could not save your hours. Please try again.' }
  }

  revalidatePath('/app/settings')
  // Capacity and slot suggestions both read these.
  revalidatePath('/app/calendar')
  revalidatePath('/app/pipeline')
  return { ok: true as const }
}

// ---------------------------------------------------------------------------

/**
 * Logo upload — a file, not a URL. Contractors do not have hosted logo URLs;
 * they have a PNG from whoever made their business cards. Public bucket on
 * purpose: the logo renders inside customers' email clients, which cannot
 * follow signed URLs. Path is companyId-keyed so re-upload replaces.
 */
export async function uploadCompanyLogo(formData: FormData) {
  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner' && session.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins can update branding' }
  }

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: 'Choose an image file.' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false as const, error: 'Logo must be under 2MB.' }
  }
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type]
  if (!ext) return { ok: false as const, error: 'PNG, JPG or WebP only.' }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const path = `${session.companyId}/logo.${ext}`

  const { error: upErr } = await admin.storage
    .from('branding')
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: true,
    })
  if (upErr) {
    console.error('logo upload failed', upErr)
    return { ok: false as const, error: 'Upload failed — try again.' }
  }

  const { data: pub } = admin.storage.from('branding').getPublicUrl(path)
  // Cache-bust: same path on re-upload, and email clients cache hard.
  const url = `${pub.publicUrl}?v=${Date.now()}`

  try {
    await query(`update companies set logo_url = $1 where id = $2`, [url, session.companyId])
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Save failed' }
  }

  revalidatePath('/app/settings')
  return { ok: true as const, data: { url } }
}
