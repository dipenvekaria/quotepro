import { appendFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { runQuoteTurn } from '@/lib/ai/quote-agent'
import { query } from '@/lib/db'

/**
 * Manual eval of the agent EDIT path — the session-management use case:
 * iterative edits must update items surgically, never redo the whole quote.
 * Proven by asserting the untouched lines keep their row ids across turns.
 *
 * Mutates the local demo draft (Acme / Sarah Johnson). `supabase db reset`
 * restores it. NOT CI — calls the real model.
 */

const OUT = join(tmpdir(), 'rivet-agent-eval.txt')
writeFileSync(OUT, `agent eval ${new Date().toISOString()}\n`)
const log = (s: string) => appendFileSync(OUT, s + '\n')
afterAll(() => console.log(`\nagent eval written to ${OUT}`))

const ctx = {
  companyId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  workItemId: '3f03d2bd-d3d8-4137-9a90-19e91b05c2cb',
}
const USER = '11111111-1111-1111-1111-111111111111' // Acme owner (local demo seed)

type Line = { id: string; name: string; quantity: number; unit_price: number; is_discount: boolean }

async function lines(): Promise<Line[]> {
  return query<Line>(
    `select id, name, quantity, unit_price, is_discount from quote_items
      where work_item_id = $1 order by sort_order, created_at`,
    [ctx.workItemId],
  )
}

function show(label: string, ls: Line[]) {
  log(`\n── ${label} ──`)
  for (const l of ls) log(`  ${l.id.slice(0, 8)}  ${l.name}  ×${l.quantity} @ $${l.unit_price}${l.is_discount ? ' [discount]' : ''}`)
  const sub = ls.reduce((s, l) => s + Number(l.unit_price) * Number(l.quantity), 0)
  log(`  subtotal: $${sub.toFixed(2)}`)
}

describe('agent edit — surgical across iterations', () => {
  it('three turns: add item, add discount, change quantity', async () => {
    const before = await lines()
    show('BEFORE', before)
    const beforeIds = new Set(before.map((l) => l.id))

    // Turn 1 — add
    const t1 = await runQuoteTurn(ctx, USER, 'Add a Nest thermostat')
    log(`\n[turn 1 reply] ${t1.reply}`)
    log(`[turn 1 tools] ${t1.toolCalls.join(', ')}`)
    const after1 = await lines()
    show('AFTER TURN 1', after1)
    for (const id of beforeIds) {
      expect(after1.some((l) => l.id === id), `pre-existing line ${id} survived turn 1`).toBe(true)
    }
    const added = after1.filter((l) => !beforeIds.has(l.id))
    expect(added.length, 'exactly one new line from turn 1').toBe(1)
    expect(added[0].name.toLowerCase()).toContain('nest')
    expect(Number(added[0].unit_price)).toBe(249)

    // Turn 2 — discount, same session
    const ids1 = new Set(after1.map((l) => l.id))
    const sub1 = after1.reduce((s, l) => s + Number(l.unit_price) * Number(l.quantity), 0)
    const t2 = await runQuoteTurn(ctx, USER, 'Add a 10% discount')
    log(`\n[turn 2 reply] ${t2.reply}`)
    log(`[turn 2 tools] ${t2.toolCalls.join(', ')}`)
    const after2 = await lines()
    show('AFTER TURN 2', after2)
    for (const id of ids1) {
      expect(after2.some((l) => l.id === id), `line ${id} survived turn 2`).toBe(true)
    }
    const disc = after2.filter((l) => !ids1.has(l.id))
    expect(disc.length, 'exactly one new line from turn 2').toBe(1)
    expect(disc[0].is_discount).toBe(true)
    expect(Number(disc[0].unit_price)).toBeCloseTo(-(sub1 * 0.1), 1)

    // Turn 3 — quantity change, same session
    const ids2 = new Set(after2.map((l) => l.id))
    const t3 = await runQuoteTurn(ctx, USER, 'Make it two of the Nest thermostat')
    log(`\n[turn 3 reply] ${t3.reply}`)
    log(`[turn 3 tools] ${t3.toolCalls.join(', ')}`)
    const after3 = await lines()
    show('AFTER TURN 3', after3)
    expect(after3.length, 'no lines added or removed by a quantity change').toBe(after2.length)
    for (const id of ids2) {
      expect(after3.some((l) => l.id === id), `line ${id} survived turn 3 — same row, not a rewrite`).toBe(true)
    }
    const nest = after3.find((l) => l.name.toLowerCase().includes('nest'))
    expect(Number(nest?.quantity)).toBe(2)

    // Session continuity — one ADK session for the quote, holding all turns.
    const sess = await query<{ n: string; turns: number }>(
      `select count(*)::text as n, max(jsonb_array_length(messages)) as turns
         from ai_conversations
        where entity_type = 'work_item' and entity_id = $1 and purpose = 'quoting'`,
      [ctx.workItemId],
    )
    log(`\n[session] rows=${sess[0].n} events=${sess[0].turns}`)
    expect(sess[0].n).toBe('1')
  }, 300_000)
})
