'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { withUser } from '@/lib/db'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  let companyId: string | undefined
  try {
    companyId = await withUser(user.id, async (q) => {
      const rows = await q<{ id: string }>(
        `select bootstrap_company(
           p_name => $1,
           p_phone => $2,
           p_email => $3,
           p_address => $4,
           p_seed_catalog => $5
         ) as id`,
        [
          parsed.data.name,
          parsed.data.phone || null,
          parsed.data.email || null,
          parsed.data.address || null,
          true,
        ],
      )
      return rows[0]?.id
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create company' }
  }

  if (!companyId) return { ok: false, error: 'Unknown error' }

  revalidatePath('/app')
  return { ok: true }
}
