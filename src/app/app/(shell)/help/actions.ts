'use server'

import { z } from 'zod'

import { getSession } from '@/lib/auth/session'
import { recordAiRun } from '@/lib/ai/run-log'
import { runAssistantTurn } from '@/lib/ai/assistant'
import type { UserRole } from '@/lib/permissions'

const schema = z.object({ message: z.string().trim().min(1).max(2000) })

/**
 * One Bolt turn. Company, user, and role ride the session — the model never
 * sees or chooses them; every tool consults all three. Proposals (like
 * sending a quote) come back structurally so the UI renders a real confirm
 * button; nothing outward happens inside this action.
 */
export async function askBolt(input: { message: string }) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Say a bit more than that.' }

  const session = await getSession()
  if (!session) return { ok: false as const, error: 'Not authenticated' }

  const startedAt = Date.now()
  try {
    const turn = await runAssistantTurn(
      { companyId: session.companyId, userId: session.userId, role: session.role as UserRole },
      parsed.data.message,
    )
    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      mode: 'assistant',
      purpose: 'assistant',
      prompt: parsed.data.message,
      result: { reply: turn.reply.slice(0, 500), tools: turn.toolCalls },
      latencyMs: Date.now() - startedAt,
    })
    return {
      ok: true as const,
      data: {
        reply:
          turn.reply ||
          (turn.toolCalls.length > 0
            ? 'Checked — nothing further to add.'
            : 'Try asking about your day, a customer, a quote, or how to do something.'),
      },
    }
  } catch (e) {
    console.error('askBolt failed', e)
    await recordAiRun({
      companyId: session.companyId,
      userId: session.userId,
      mode: 'unavailable',
      purpose: 'assistant',
      prompt: parsed.data.message,
      result: { error: e instanceof Error ? e.message : String(e) },
      latencyMs: Date.now() - startedAt,
    })
    return { ok: false as const, error: 'Bolt is unavailable right now — nothing was changed.' }
  }
}
