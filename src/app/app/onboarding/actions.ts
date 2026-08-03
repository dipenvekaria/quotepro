'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const inputSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

export type BootstrapCompanyState = {
  ok: boolean
  error?: string
}

export async function bootstrapCompany(_prev: BootstrapCompanyState, formData: FormData): Promise<BootstrapCompanyState> {
  const parsed = inputSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') ?? undefined,
    email: formData.get('email') ?? undefined,
    address: formData.get('address') ?? undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('bootstrap_company', {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone || null,
    p_email: parsed.data.email || null,
    p_address: parsed.data.address || null,
    p_seed_catalog: true,
  })

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Unknown error' }

  revalidatePath('/app')
  return { ok: true }
}
