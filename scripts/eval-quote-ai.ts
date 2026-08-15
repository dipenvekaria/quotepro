/**
 * Quote drafting, run across several trades at once.
 *
 * A prompt evaluated on one trade is a prompt tuned to one trade. Rivet ships
 * catalogs for a hundred of them, priced by the hour, the square foot, the ton
 * and the unit, so a rule that reads as helpful against HVAC can be quietly
 * wrong for a landscaper. This runs the same shapes of job description against
 * genuinely different catalogs and reports what came back, so a change can be
 * judged on all of them rather than the one in front of you.
 *
 *   DATABASE_URL=... npx tsx scripts/eval-quote-ai.ts
 *   DATABASE_URL=... npx tsx scripts/eval-quote-ai.ts --trade residential-roofing-installation-and-repair
 *
 * Creates a scratch company per trade, loads that trade's starter catalog into
 * it, drafts, then deletes the company. Nothing is left behind.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { config } from 'dotenv'
config({ path: '.env.local' })

import { generateQuote } from '@/lib/ai/quote'
import { query } from '@/lib/db'

/** Deliberately different pricing models: hourly, per-unit, per-sq-ft, per-visit. */
const TRADES = [
  'residential-hvac-service-and-repair',
  'residential-plumbing-service-and-repair',
  'residential-roofing-installation-and-repair',
  'residential-electrical-contracting',
  'residential-landscaping-and-lawn-care',
]

/**
 * Job descriptions by *shape*, not by trade, so the same probe lands on every
 * catalog: a vague call, a precise one, one with a measurement, one that names
 * something no catalog carries, and one that is barely a sentence.
 */
const PROMPTS: { label: string; text: string }[] = [
  { label: 'vague', text: 'Customer says it is not working properly, needs someone to come look' },
  { label: 'specific', text: 'Replace the failed unit and do a full test before leaving' },
  { label: 'measured', text: 'Job covers about 1,800 square feet, customer wants it done in one visit' },
  { label: 'unstocked', text: 'Customer wants a helicopter pad installed on the roof' },
  { label: 'terse', text: 'leak' },
  { label: 'multi-part', text: 'Two separate problems at the same address, plus an annual service while there' },
]

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

type Row = { name: string; unit: string | null; base_price: number; category: string | null }

function loadCatalog(slug: string): Row[] {
  const text = readFileSync(join(process.cwd(), 'data', 'starter-catalogs', `${slug}.csv`), 'utf8')
  const out: Row[] = []
  for (const line of text.split('\n')) {
    // Naive split is fine: these files are generated, and any row with an
    // embedded comma simply fails the price check below and is skipped.
    const parts = line.split(',')
    if (parts.length < 7) continue
    const price = Number(parts[4])
    if (!Number.isFinite(price)) continue
    out.push({ name: parts[0], unit: parts[3], base_price: price, category: parts[2] })
  }
  return out
}

async function withScratchCompany<T>(slug: string, fn: (companyId: string) => Promise<T>): Promise<T> {
  const [co] = await query<{ id: string }>(
    `insert into companies (name, settings)
     values ($1, '{"tax_rate": 8.5}'::jsonb) returning id`,
    [`Eval ${slug} ${randomUUID().slice(0, 6)}`],
  )
  try {
    const rows = loadCatalog(slug)
    for (const r of rows) {
      await query(
        `insert into catalog_items (company_id, name, category, unit, base_price)
         values ($1, $2, $3, $4, $5)`,
        [co.id, r.name, r.category, r.unit, r.base_price],
      )
    }
    return await fn(co.id)
  } finally {
    await query('delete from companies where id = $1', [co.id])
  }
}

/** Cheap signals worth eyeballing; not a score, just what to look at. */
function observations(items: { name: string; quantity: number; unit_price: number }[], catalog: Row[]) {
  const byName = new Map(catalog.map((c) => [c.name.toLowerCase(), c]))
  const notes: string[] = []

  if (items.length === 0) return ['EMPTY — nothing returned']

  // Several variants of the same thing = alternatives presented as a bill of
  // materials, which reads to a contractor as duplicates.
  const cats = items.map((i) => byName.get(i.name.toLowerCase())?.category).filter(Boolean)
  const dupeCat = cats.find((c, i) => cats.indexOf(c) !== i)
  if (dupeCat) notes.push(`two items from category "${dupeCat}"`)

  // A quantity of 1 on something sold by area or length is almost never right.
  for (const it of items) {
    const unit = byName.get(it.name.toLowerCase())?.unit?.toLowerCase() ?? ''
    if (/sq ft|linear ft|ton|pound|gallon/.test(unit) && it.quantity === 1) {
      notes.push(`qty 1 on a "${unit}" item (${it.name.slice(0, 30)})`)
    }
  }

  const hasLabour = items.some((i) => /labor|labour|hour|service call|trip|diagnos/i.test(i.name))
  if (!hasLabour) notes.push('no labour or call-out line')

  return notes.length ? notes : ['looks reasonable']
}

async function main() {
  const only = arg('trade')
  const trades = only ? [only] : TRADES

  for (const slug of trades) {
    console.log(`\n${'='.repeat(78)}\n${slug}\n${'='.repeat(78)}`)
    let catalog: Row[]
    try {
      catalog = loadCatalog(slug)
    } catch {
      console.log('  (no starter catalog — skipped)')
      continue
    }

    await withScratchCompany(slug, async (companyId) => {
      for (const p of PROMPTS) {
        const r = await generateQuote({ companyId, description: p.text })
        const total = r.line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
        console.log(`\n  [${p.label}] "${p.text.slice(0, 62)}"`)
        console.log(`  mode=${r.mode}  lines=${r.line_items.length}  total=$${total.toFixed(2)}`)
        for (const li of r.line_items) {
          console.log(`     ${li.quantity} x ${li.name.slice(0, 46)}  $${li.unit_price}`)
        }
        for (const q of r.questions) {
          console.log(`     ASKS: ${q.question}`)
          console.log(`           options: ${q.options.join(' / ')}`)
        }
        for (const u of r.unmet) console.log(`     UNMET: ${u}`)
        for (const note of observations(r.line_items, catalog)) console.log(`     → ${note}`)
      }
    })
  }
  process.exit(0)
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
