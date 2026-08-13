/**
 * Adds the pricing model to the generated starter catalogs.
 *
 * docs/STRATEGY.md is explicit that shipping prices is the wrong move: task
 * times are stable across regions, labor rates are not — they vary two to three
 * times between markets. So each item gets decomposed into the durable half,
 *
 *   price = labor_hours x labor_rate + material_cost x (1 + markup)
 *
 * and onboarding computes the price from the contractor's own rate and markup.
 * They land on a full catalog at their own numbers and we never invent a price.
 *
 * `labor_hours` and `material_cost` are already columns on `catalog_items`.
 *
 *   npx tsx --env-file=.env.local scripts/augment-catalog-pricing.ts
 *
 * Resumable: a file that already has the columns is skipped.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Type, generateJson, geminiModels, type Schema } from '../src/lib/ai/gemini'
import { mapHeaders, parseCsv, parsePrice } from '../src/lib/csv'

const DIR = join(process.cwd(), 'data', 'starter-catalogs')
const DELAY_MS = Number(process.env.DELAY_MS ?? 2500)

/**
 * The rates the existing generated prices are assumed to have been drawn at.
 * They only exist to decompose those prices; nothing downstream uses them,
 * because onboarding substitutes the contractor's own.
 */
const REF_LABOR_RATE = 125
const REF_MARKUP = 0.5

type Row = {
  name: string
  description: string
  category: string
  unit: string
  price: number
  labor_hours: number
  material_cost: number
}

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          labor_hours: { type: Type.NUMBER },
          material_cost: { type: Type.NUMBER },
        },
        required: ['name', 'labor_hours', 'material_cost'],
      },
    },
  },
  required: ['items'],
}

function systemPrompt(trade: string) {
  return `You break a contractor's flat-rate price into the two things it is actually made of: technician time, and materials at cost.

TRADE: ${trade}

For every item given, return:
- \`labor_hours\` — technician hours on site for one unit of that item. 0 for a pure material or a pass-through fee. Fractional is fine (0.25, 1.5).
- \`material_cost\` — what the contractor PAYS a supplier for the materials in one unit, before any markup. 0 for pure labor, inspections, and fees.

The quoted price you are given was drawn at a labor rate of $${REF_LABOR_RATE}/hour and a materials markup of ${REF_MARKUP * 100}%, so your two numbers should satisfy roughly:

  price = labor_hours x ${REF_LABOR_RATE} + material_cost x ${1 + REF_MARKUP}

Rules:
- Copy each item's name back EXACTLY as given. An item whose name does not match is discarded.
- Respect the unit. A "sq ft" item's numbers are per square foot and will be small. An "hour" item is labor_hours 1, material_cost 0.
- Be realistic about the split. A capacitor replacement is mostly labor; a water heater is mostly material.
- Return every item you were given, once.
- Return valid JSON only.`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`)

function csvCell(v: string | number) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Used when the model omits an item or returns something that cannot be
 * reconciled. Splitting on the unit is crude but never leaves a row without a
 * pricing model, which would make it unpriceable at onboarding.
 */
function fallbackSplit(unit: string, price: number) {
  const u = unit.trim().toLowerCase()
  if (u === 'hour' || u === 'day' || u === 'visit') {
    return { labor_hours: Math.max(0.25, price / REF_LABOR_RATE), material_cost: 0 }
  }
  // Half labor, half material, at the reference rates.
  const labor = price * 0.5
  const material = (price * 0.5) / (1 + REF_MARKUP)
  return { labor_hours: labor / REF_LABOR_RATE, material_cost: material }
}

function round(n: number, dp: number) {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

async function augment(file: string): Promise<{ rows: number; modelled: number } | null> {
  const path = join(DIR, file)
  const text = readFileSync(path, 'utf8')
  const table = parseCsv(text)
  if (table.length < 2) return null

  const cols = mapHeaders(table[0])
  if (cols.name === undefined || cols.base_price === undefined) return null

  const original = table.slice(1).flatMap((r) => {
    const name = (r[cols.name as number] ?? '').trim()
    const price = parsePrice(r[cols.base_price as number] ?? '')
    if (!name || price === null || price <= 0) return []
    return [
      {
        name,
        description: cols.description !== undefined ? (r[cols.description] ?? '') : '',
        category: cols.category !== undefined ? (r[cols.category] ?? '') : '',
        unit: cols.unit !== undefined ? (r[cols.unit] ?? 'each') : 'each',
        price,
      },
    ]
  })
  if (original.length === 0) return null

  const trade = file.replace(/\.csv$/, '').replace(/-/g, ' ')
  const listing = original.map((i) => `- ${i.name} | ${i.unit} | $${i.price}`).join('\n')

  const res = await generateJson({
    system: systemPrompt(trade),
    contents: `Decompose these ${original.length} items:\n${listing}\n`,
    schema: SCHEMA,
  })

  const byName = new Map<string, { labor_hours: number; material_cost: number }>()
  if (res) {
    const items = (res.data as { items?: { name?: unknown; labor_hours?: unknown; material_cost?: unknown }[] })
      .items ?? []
    for (const it of items) {
      if (typeof it.name !== 'string') continue
      const lh = Number(it.labor_hours)
      const mc = Number(it.material_cost)
      if (!Number.isFinite(lh) || !Number.isFinite(mc) || lh < 0 || mc < 0) continue
      byName.set(it.name.trim().toLowerCase(), { labor_hours: lh, material_cost: mc })
    }
  }

  let modelled = 0
  const rows: Row[] = original.map((i) => {
    const hit = byName.get(i.name.toLowerCase())
    // A decomposition that rebuilds to a wildly different number means the
    // model misread the unit or the scale; the fallback is safer than a
    // catalog item that reprices to ten times the reference.
    const rebuilt = hit ? hit.labor_hours * REF_LABOR_RATE + hit.material_cost * (1 + REF_MARKUP) : 0
    const sane = hit && rebuilt > 0 && rebuilt >= i.price * 0.4 && rebuilt <= i.price * 2.5

    const split = sane ? hit : fallbackSplit(i.unit, i.price)
    if (sane) modelled++

    return {
      ...i,
      labor_hours: round(split.labor_hours, 3),
      material_cost: round(split.material_cost, 2),
    }
  })

  const head = 'name,description,category,unit,price,labor_hours,material_cost'
  const body = rows.map((r) =>
    [r.name, r.description, r.category, r.unit, r.price, r.labor_hours, r.material_cost]
      .map(csvCell)
      .join(','),
  )
  writeFileSync(path, `${[head, ...body].join('\n')}\n`)

  return { rows: rows.length, modelled }
}

async function main() {
  log(`models: ${geminiModels().join(' → ')}`)
  const files = readdirSync(DIR).filter((f) => f.endsWith('.csv')).sort()

  let done = 0
  let skipped = 0
  let totalRows = 0
  let totalModelled = 0

  for (const [i, file] of files.entries()) {
    const first = readFileSync(join(DIR, file), 'utf8').slice(0, 200)
    if (first.includes('labor_hours')) {
      skipped++
      continue
    }

    try {
      const r = await augment(file)
      if (!r) {
        log(`${i + 1}/${files.length} ${file} — SKIPPED (unreadable)`)
      } else {
        done++
        totalRows += r.rows
        totalModelled += r.modelled
        const pct = Math.round((r.modelled / r.rows) * 100)
        log(`${i + 1}/${files.length} ${file} — ${r.rows} rows, ${pct}% modelled`)
      }
    } catch (e) {
      log(`${i + 1}/${files.length} ${file} — ERROR ${e instanceof Error ? e.message.slice(0, 100) : e}`)
    }

    await sleep(DELAY_MS)
  }

  const pct = totalRows ? Math.round((totalModelled / totalRows) * 100) : 0
  log(`done. augmented ${done}, already done ${skipped}. ${pct}% of rows priced by the model, rest by fallback.`)
}

main().catch((e) => {
  console.error('augment-catalog-pricing failed', e)
  process.exit(1)
})
