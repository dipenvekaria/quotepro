'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db'

const passCardFeesSchema = z.object({ pass_card_fees: z.boolean() })

/**
 * The checkbox on the Stripe card. The old UI POSTed to an API route that
 * was never written — a dead control toasting "Could not save preference."
 */
export async function setPassCardFees(input: z.infer<typeof passCardFeesSchema>) {
  const parsed = passCardFeesSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner') {
    return { ok: false as const, error: 'Only owners and admins can change payment settings.' }
  }

  await query('update companies set pass_card_fees = $1 where id = $2', [
    parsed.data.pass_card_fees,
    session.companyId,
  ])
  revalidatePath('/app/integrations')
  return { ok: true as const }
}


const enableVoiceSchema = z.object({
  phone_number: z
    .string()
    .trim()
    .regex(/^\+1\d{10}$/, 'Use the full number with country code, like +14155550123.'),
})

/**
 * Turns on call answering for this company: creates their Retell agent
 * (Gemini-backed, greeting in their name) and points the number's inbound
 * calls at it. The number must already be imported into Retell — the card
 * explains that; binding an unknown number fails loudly here.
 */
export async function enableVoice(input: z.infer<typeof enableVoiceSchema>) {
  const parsed = enableVoiceSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }
  if (session.role !== 'owner') {
    return { ok: false as const, error: 'Only the owner can set up call answering.' }
  }

  const { voiceConfigured, createCompanyAgent, bindNumber } = await import('@/lib/voice/retell')
  if (!voiceConfigured()) {
    return { ok: false as const, error: 'Call answering is not configured on the platform yet.' }
  }

  const [company] = await query<{ name: string; retell_agent_id: string | null }>(
    `select name, retell_agent_id from companies where id = $1 limit 1`,
    [session.companyId],
  )
  if (!company) return { ok: false as const, error: 'Company not found' }

  try {
    const agentId = company.retell_agent_id ?? (await createCompanyAgent(company.name)).agent_id
    await bindNumber(parsed.data.phone_number, agentId)
    await query(
      `update companies
          set voice_enabled = true, retell_agent_id = $2, voice_number = $3
        where id = $1`,
      [session.companyId, agentId, parsed.data.phone_number],
    )
  } catch (e) {
    console.error('enableVoice failed', e)
    return {
      ok: false as const,
      error: 'Retell rejected the setup — check the number is imported there, then try again.',
    }
  }

  revalidatePath('/app/integrations')
  return { ok: true as const }
}
