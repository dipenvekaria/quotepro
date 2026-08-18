import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PostgresSessionService } from '@/lib/ai/quote-session'
import { query } from '@/lib/db'

import { createCompany, createUser, setMembership, type TestCompany } from './fixtures'
import { requireDatabase } from './setup'

/**
 * The ADK session and the AI run log share `ai_conversations`, keyed on the
 * same (company, entity_type, entity_id). Only `purpose` separates them —
 * 'quoting' for the conversation, everything else for one-shot run records.
 *
 * Every statement in PostgresSessionService must therefore carry
 * `purpose = 'quoting'`. Without it, the session lookup once picked up a
 * generation's log row as "the session" and appendEvent wrote conversation
 * turns into every matching row — 28 stray events on a run-log record.
 */

let co: TestCompany
let userId: string
const workItemId = crypto.randomUUID() // polymorphic key; no FK to work_items

beforeAll(async () => {
  await requireDatabase()
  co = await createCompany('Session Scope Co')
  const u = await createUser(`sess-${crypto.randomUUID().slice(0, 8)}@test.local`)
  await setMembership(u.id, co.id, 'owner')
  userId = u.id

  // A run-log row for the same work item — what generation writes.
  await query(
    `insert into ai_conversations
       (company_id, user_id, entity_type, entity_id, agent_name, model, purpose, messages, status)
     values ($1, $2, 'work_item', $3, 'rivet-quote-generator', 'gemini:test', 'quote_generation',
             '[{"role":"user","text":"draft"},{"role":"model","summary":{}}]'::jsonb, 'success')`,
    [co.id, userId, workItemId],
  )
})

afterAll(async () => {
  if (co?.id) await query('delete from companies where id = $1', [co.id])
})

describe('sessions never touch run-log rows', () => {
  it('create, read and append stay inside purpose=quoting', async () => {
    const svc = new PostgresSessionService(co.id)

    const session = await svc.createSession({
      appName: 'rivet-quoting',
      userId,
      sessionId: workItemId,
      state: {},
    })
    expect(session.id).toBe(workItemId)
    // A fresh session, not the run-log row masquerading as one.
    expect(session.events).toHaveLength(0)

    await svc.appendEvent({
      session,
      event: {
        id: 'evt-1',
        author: 'user',
        content: { role: 'user', parts: [{ text: 'add a thermostat' }] },
        timestamp: Date.now() / 1000,
      } as never,
    })

    const rows = await query<{ purpose: string; n: number }>(
      `select purpose, jsonb_array_length(messages) as n
         from ai_conversations
        where company_id = $1 and entity_type = 'work_item' and entity_id = $2
        order by purpose`,
      [co.id, workItemId],
    )
    // Two rows: the untouched run log and the session that took the event.
    expect(rows).toEqual([
      { purpose: 'quote_generation', n: 2 },
      { purpose: 'quoting', n: 1 },
    ])

    const again = await svc.getSession({ appName: 'rivet-quoting', userId, sessionId: workItemId })
    expect(again?.events).toHaveLength(1)
  })

  it('cannot read another company’s session', async () => {
    const other = new PostgresSessionService(crypto.randomUUID())
    const got = await other.getSession({
      appName: 'rivet-quoting',
      userId,
      sessionId: workItemId,
    })
    expect(got).toBeUndefined()
  })
})
