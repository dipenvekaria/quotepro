import { appendFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, it } from 'vitest'

import { generateQuote } from '@/lib/ai/quote'
import { generateTieredQuote } from '@/lib/ai/tiers'
import { estimateFromCatalog } from '@/lib/ai/estimate'

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

  it('tiers: good/better/best on the AC repair', async () => {
    const t = await generateTieredQuote({
      companyId: CO,
      description: REALISTIC[0][1],
      taxRate: 8.5,
    })
    log(`\n${'='.repeat(72)}\n▶ TIERS (mode ${t?.mode ?? 'null'})`)
    if (!t) return log('  (null — could not build tiers)')
    for (const tier of t.tiers) {
      log(`  [${tier.tier}] ${tier.name} — $${tier.total}${tier.isRecommended ? ' ★' : ''}`)
      for (const li of tier.line_items) log(`      • ${li.name} ×${li.quantity} @ $${li.unit_price}`)
    }
  }, 120_000)

  it('tiers: placeholder "Quote" (should NOT fabricate)', async () => {
    log(`\n${'='.repeat(72)}\n▶ TIERS on "Quote":`)
    try {
      const t = await generateTieredQuote({ companyId: CO, description: 'Quote', taxRate: 8.5 })
      if (!t) return log('  (null — refused, good)')
      log('  !! FABRICATED:')
      for (const tier of t.tiers) {
        log(`  [${tier.tier}] ${tier.name} — $${tier.total}`)
        for (const li of tier.line_items) log(`      • ${li.name} ×${li.quantity} @ $${li.unit_price}`)
      }
    } catch (e) {
      log(`  threw ${e instanceof Error ? e.name : 'unknown'} — refused before the model, good`)
    }
  }, 120_000)

  it('estimate: something the book does not carry', async () => {
    const e = await estimateFromCatalog(CO, 'Aeroseal aerosol duct sealing')
    log(`\n${'='.repeat(72)}\n▶ ESTIMATE for Aeroseal:`)
    log(e ? `  $${e.price} — ${e.basis}` : '  (null — refused to estimate)')
  }, 120_000)
})
