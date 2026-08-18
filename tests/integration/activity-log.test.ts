import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { logActivity, timelineForWorkItem } from '@/lib/activity'
import { query } from '@/lib/db'

import { createCompany, createUser, setMembership, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * The audit trail answers "what happened on this quote" — so it must record,
 * stay inside its tenant, and merge with the AI runs without swallowing the
 * ADK session row that shares their table.
 */

let co: TestCompany
let userId: string
const workItemId = crypto.randomUUID()

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Audit Trail Co')
  const u = await createUser(`audit-${crypto.randomUUID().slice(0, 8)}@test.local`)
  await setMembership(u.id, co.id, 'owner')
  userId = u.id
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

describe('the trail records and merges', () => {
  it('writes, merges with AI runs, and excludes the ADK session row', async () => {
    await logActivity({
      companyId: co.id,
      userId,
      entityId: workItemId,
      action: 'quote_sent',
      description: 'Quote sent to the customer',
    })
    await logActivity({
      companyId: co.id,
      entityId: workItemId,
      action: 'quote_accepted',
      description: 'Accepted by Pat Tester',
      changes: { signed_by: 'Pat Tester' },
    })

    // An AI run and an ADK session row for the same quote.
    await query(
      `insert into ai_conversations
         (company_id, user_id, entity_type, entity_id, agent_name, model, purpose, messages, status, cost_usd)
       values
         ($1, $2, 'work_item', $3, 'rivet-quote-generator', 'gemini:test', 'quote_generation', '[]'::jsonb, 'success', 0.0005),
         ($1, $2, 'work_item', $3, 'rivet-quoting', 'gemini:test', 'quoting', '[{"e":1},{"e":2}]'::jsonb, 'active', 0)`,
      [co.id, userId, workItemId],
    )

    const timeline = await timelineForWorkItem(co.id, workItemId)
    const actions = timeline.map((t) => t.action)

    expect(actions).toContain('quote_sent')
    expect(actions).toContain('quote_accepted')
    expect(actions).toContain('quote_generation')
    // The conversation is not an event; it must never appear as one.
    expect(actions).not.toContain('quoting')

    const accepted = timeline.find((t) => t.action === 'quote_accepted')
    expect(accepted?.actor).toBe('customer')
    expect(accepted?.detail).toEqual({ signed_by: 'Pat Tester' })

    // Oldest first — the order a person reads a story in.
    const times = timeline.map((t) => t.at)
    expect([...times].sort()).toEqual(times)
  })

  it('cannot read another company’s trail', async () => {
    const other = await createCompany('Bystander Audit Co')
    const timeline = await timelineForWorkItem(other.id, workItemId)
    expect(timeline).toEqual([])
    await query('delete from companies where id = $1', [other.id])
  })

  it('never throws — a failed log is a logged failure, not a failed action', async () => {
    // Violates the FK on company_id; must swallow, not raise.
    await expect(
      logActivity({
        companyId: crypto.randomUUID(),
        entityId: workItemId,
        action: 'quote_sent',
      }),
    ).resolves.toBeUndefined()
  })
})
