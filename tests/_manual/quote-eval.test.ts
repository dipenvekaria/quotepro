import { appendFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, it } from 'vitest'

import { beforeAll } from 'vitest'

import { generateQuote } from '@/lib/ai/quote'
import { estimateFromCatalog } from '@/lib/ai/estimate'
import { indexCatalog } from '@/lib/ai/catalog-index'
import { query } from '@/lib/db'

// Vitest buffers console output per test; a file keeps the whole run readable.
const OUT = join(tmpdir(), 'rivet-quote-eval.txt')
writeFileSync(OUT, `quote eval ${new Date().toISOString()}\n`)
const log = (s: string) => appendFileSync(OUT, s + '\n')
afterAll(() => console.log(`\nquote eval written to ${OUT}`))

/**
 * Manual eval of the quote-drafting secret sauce. NOT a CI test — it calls the
 * real model and costs money. Run explicitly:
 *   npx vitest run <this file> --testTimeout=120000
 */

const CO = '1b2a2540-03ce-41d9-a612-a15975506217' // Northside HVAC, 101-item HVAC book

beforeAll(async () => {
  // db reset wipes embeddings and nothing re-indexes them; the eval should
  // exercise the real vector path, so index once when empty.
  const [{ n }] = await query<{ n: number }>(
    'select count(*)::int as n from document_embeddings where company_id = $1',
    [CO],
  )
  if (n === 0) {
    const res = await indexCatalog(CO)
    log(`(indexed ${res.indexed} catalog embeddings first)`)
  }
}, 120_000)

function show(label: string, q: Awaited<ReturnType<typeof generateQuote>>) {
  const sub = q.line_items.reduce((s, li) => s + li.unit_price * li.quantity, 0)
  log(`\n${'='.repeat(72)}\n▶ ${label}\n  mode: ${q.mode}`)
  if (q.line_items.length === 0) log('  (no line items)')
  for (const li of q.line_items) {
    const tag = li.is_discount ? ' [discount]' : li.is_upsell ? ' [upsell]' : ''
    log(`   • ${li.name}  ×${li.quantity} @ $${li.unit_price}${tag}`)
  }
  log(`  subtotal: $${sub.toFixed(2)}`)
  if (q.questions.length) for (const qq of q.questions) log(`  ? ${qq.question}  [${qq.options.join(' / ')}]`)
  if (q.unmet.length) log(`  ⚠ unmet: ${q.unmet.join('; ')}`)
  log(`  reasoning: ${q.reasoning.slice(0, 220)}`)
}

const REALISTIC: [string, string][] = [
  ['clear AC repair', 'AC stopped cooling. Found the condenser fan motor seized and the run capacitor bulged. Replace both and test the system.'],
  ['furnace repair, two faults', "Gas furnace won't stay lit — flame sensor is filthy and the flue pipe has a crack. Fix both."],
  ['maintenance tune-up', 'Annual AC maintenance: clean the evaporator coil in place, replace the 4 inch media filter, and do a nitrogen pressure test.'],
  ['big install', 'Customer wants a complete multi-zone mini split for a 3-bedroom house.'],
]

const AMBIGUOUS: [string, string][] = [
  ['condenser, no tonnage', 'Replace the air conditioner condenser.'], // priced per ton — should ask size
]

const MISSING: [string, string][] = [
  ['out of trade', 'Install a Generac whole-house standby generator with a transfer switch.'],
]

const ADVERSARIAL: [string, string][] = [
  ['placeholder "Quote"', 'Quote'],
  ['gibberish', 'asdfghjkl qwerty'],
  // The production repro behind "AI drafting is unavailable": a discount with
  // no work correctly drafts zero items — an answer, never an outage. The case
  // passing at all IS the assertion (an AiUnavailableError throw fails it).
  ['discount only, nothing to discount', 'give 10% discount'],
]

describe('quote drafting — real model, real catalog', () => {
  it.each([...REALISTIC, ...AMBIGUOUS, ...MISSING, ...ADVERSARIAL])(
    'generate: %s',
    async (label, description) => {
      const q = await generateQuote({ companyId: CO, description, customerName: 'Test' })
      show(label, q)
    },
    120_000,
  )

  // The regression cases: both items sit past position 80 alphabetically, so
  // the old first-80 grounding could never quote them. Hard assertions.
  it('finds the Smart Thermostat (alphabetical position 82)', async () => {
    const q = await generateQuote({ companyId: CO, description: 'Install a smart thermostat with a remote sensor', customerName: 'Test' })
    show('smart thermostat (past old cutoff)', q)
    const names = q.line_items.map((li) => li.name)
    if (!names.some((n) => n.toLowerCase().includes('smart thermostat'))) {
      throw new Error(`Smart Thermostat not quoted; got: ${names.join(' | ')}`)
    }
  }, 120_000)

  it('finds the Zone Control Board (alphabetical position 100)', async () => {
    const q = await generateQuote({ companyId: CO, description: 'Replace the failed zone control board', customerName: 'Test' })
    show('zone control board (past old cutoff)', q)
    const names = q.line_items.map((li) => li.name)
    if (!names.some((n) => n.toLowerCase().includes('zone control board'))) {
      throw new Error(`Zone Control Board not quoted; got: ${names.join(' | ')}`)
    }
  }, 120_000)

  it('estimate: something the book does not carry', async () => {
    const e = await estimateFromCatalog(CO, 'Aeroseal aerosol duct sealing')
    log(`\n${'='.repeat(72)}\n▶ ESTIMATE for Aeroseal:`)
    log(e ? `  $${e.price} — ${e.basis}` : '  (null — refused to estimate)')
  }, 120_000)
})
