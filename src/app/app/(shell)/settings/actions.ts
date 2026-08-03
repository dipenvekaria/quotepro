'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.company_id) return { ok: false as const, error: 'No company' }
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return { ok: false as const, error: 'Only owners and admins can update settings' }
  }

  const { data: current } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', profile.company_id)
    .maybeSingle()

  const currentSettings = (current?.settings ?? {}) as Record<string, unknown>

  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logo_url || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      settings: { ...currentSettings, tax_rate: parsed.data.tax_rate },
    })
    .eq('id', profile.company_id)

  if (error) return { ok: false as const, error: error.message }

  revalidatePath('/app/settings')
  revalidatePath('/app')
  return { ok: true as const }
}
