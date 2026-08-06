'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  name: z.string().min(2).max(120),
  logo_url: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  tax_rate: z.number().min(0).max(30),
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
  const currentSettings = (current?.settings ?? {}) as Record<string, unknown>
  const nextSettings = { ...currentSettings, tax_rate: parsed.data.tax_rate }

  try {
    await query(
      `update companies
          set name = $1, logo_url = $2, phone = $3, email = $4, address = $5, settings = $6::jsonb
        where id = $7`,
      [
        parsed.data.name,
        parsed.data.logo_url || null,
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
