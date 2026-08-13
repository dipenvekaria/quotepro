/**
 * Generates per-trade starter catalogs.
 *
 * A new Rivet account cannot produce a quote until it has catalog items, and
 * "type in your whole price book first" is the activation cliff described in
 * docs/PRODUCT_REVIEW.md. These files are the other side of that: pick your
 * trade at onboarding, get a working catalog, edit the prices.
 *
 * Output is CSV in the shape src/lib/csv.ts already imports (name, description,
 * category, unit, price), so the generated files go through the same path a
 * contractor's own spreadsheet does — no second importer to keep in step.
 *
 *   npx tsx --env-file=.env.local scripts/generate-starter-catalogs.ts
 *
 * Resumable: a trade whose CSV already exists is skipped, so a 429 partway
 * through costs nothing but time. Re-run it.
 *
 * The prompts stay inline rather than in prompts/. That directory is bundled
 * into every serverless function by outputFileTracingIncludes, and build-time
 * tooling has no business shipping to production.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { Type, generateJson, geminiModels, type Schema } from '../src/lib/ai/gemini'

const OUT_DIR = join(process.cwd(), 'data', 'starter-catalogs')
const TRADES_FILE = join(OUT_DIR, '_trades.json')

const TRADE_COUNT = Number(process.env.TRADE_COUNT ?? 100)
const ITEM_COUNT = Number(process.env.ITEM_COUNT ?? 100)
/** Free-tier RPM is the binding limit, not tokens. Stay well under it. */
const DELAY_MS = Number(process.env.DELAY_MS ?? 4000)

type Trade = { name: string; category: string }
type Item = {
  name: string
  description: string
  category: string
  unit: string
  price: number
}

// ---------------------------------------------------------------------------

const TRADES_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    trades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ['name', 'category'],
      },
    },
  },
  required: ['trades'],
}

const ITEMS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          unit: { type: Type.STRING },
          price: { type: Type.NUMBER },
        },
        required: ['name', 'description', 'category', 'unit', 'price'],
      },
    },
  },
  required: ['items'],
}

const TRADES_PROMPT = `You list the trades that field-service contracting software sells to.

Return the ${TRADE_COUNT} largest by number of businesses operating in the United States, most common first.

Rules:
- Real trades a licensed or established contractor operates under, the kind that sends a technician to a property and issues a quote.
- Be specific enough to imply a distinct price book. "Garage Door Installation & Repair" and "Septic System Service" are trades. "Home Services" is not.
- No duplicates and no overlapping pairs where one fully contains the other.
- \`category\` groups the trade into one of: Mechanical, Plumbing, Electrical, Exterior, Interior, Grounds, Specialty, Cleaning, Restoration, Inspection.
- Return valid JSON only.`

function itemsPrompt(trade: Trade) {
  return `You are building the default price book that ships with field-service software for one trade.

TRADE: ${trade.name} (${trade.category})

Return ${ITEM_COUNT} line items that a working ${trade.name} contractor in the United States would actually have on a quote.

Rules:
- Cover the whole job mix: diagnostics and service calls, labor rates, the common repairs, the common replacements, materials and parts, permits and disposal, and the upsells that genuinely get sold.
- \`name\` is what appears on a customer's quote. Specific, no marketing language. "Condenser Fan Motor Replacement", not "Motor Service".
- \`description\` is one short clause of scope, at most 12 words. No sentences, no selling.
- \`category\` groups items within this trade — 6 to 12 distinct groups across the set.
- \`unit\` is one of: each, hour, day, sq ft, linear ft, job, visit, ton, gallon.
- \`price\` is what the contractor CHARGES the customer in USD, not their cost. A plausible national average. Whole dollars.
- No duplicates, and no two items that differ only in wording.
- Return valid JSON only.`
}

// ---------------------------------------------------------------------------

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function csvCell(v: string | number) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(items: Item[]) {
  const head = 'name,description,category,unit,price'
  const rows = items.map((i) =>
    [i.name, i.description, i.category, i.unit, i.price].map(csvCell).join(','),
  )
  return `${[head, ...rows].join('\n')}\n`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

// ---------------------------------------------------------------------------

async function getTrades(): Promise<Trade[]> {
  if (existsSync(TRADES_FILE)) {
    const cached = JSON.parse(readFileSync(TRADES_FILE, 'utf8')) as Trade[]
    log(`trades: ${cached.length} from cache`)
    return cached
  }

  const res = await generateJson({
    system: TRADES_PROMPT,
    contents: `List the top ${TRADE_COUNT} trades.`,
    schema: TRADES_SCHEMA,
  })
  if (!res) throw new Error('trade list failed on every model')

  const raw = (res.data as { trades?: Trade[] }).trades ?? []
  const seen = new Set<string>()
  const trades = raw.filter((t) => {
    const k = slugify(t.name)
    if (!t.name || seen.has(k)) return false
    seen.add(k)
    return true
  })

  writeFileSync(TRADES_FILE, `${JSON.stringify(trades, null, 2)}\n`)
  log(`trades: ${trades.length} generated via ${res.model}`)
  return trades
}

async function generateItems(trade: Trade): Promise<Item[] | null> {
  const res = await generateJson({
    system: itemsPrompt(trade),
    contents: `Build the ${ITEM_COUNT}-item price book for ${trade.name}.`,
    schema: ITEMS_SCHEMA,
  })
  if (!res) return null

  const raw = (res.data as { items?: Item[] }).items ?? []
  const seen = new Set<string>()

  return raw.filter((i) => {
    // Zero is rejected, not just negative. The model returns 0 for a handful of
    // real services per run ("Standard Carpet Cleaning"), and a $0 line item
    // imports as free work — the exact failure parsePrice() guards against on
    // the contractor's own spreadsheet.
    if (!i?.name || typeof i.price !== 'number' || !Number.isFinite(i.price) || i.price <= 0) {
      return false
    }
    const k = i.name.trim().toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  log(`models: ${geminiModels().join(' → ')}`)

  const trades = await getTrades()

  let made = 0
  let skipped = 0
  const failed: string[] = []

  for (const [i, trade] of trades.entries()) {
    const file = join(OUT_DIR, `${slugify(trade.name)}.csv`)
    const label = `${i + 1}/${trades.length} ${trade.name}`

    if (existsSync(file)) {
      skipped++
      continue
    }

    try {
      const items = await generateItems(trade)
      if (!items || items.length === 0) {
        failed.push(trade.name)
        log(`${label} — FAILED (no usable items)`)
      } else {
        writeFileSync(file, toCsv(items))
        made++
        log(`${label} — ${items.length} items`)
      }
    } catch (e) {
      failed.push(trade.name)
      log(`${label} — ERROR ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`)
    }

    await sleep(DELAY_MS)
  }

  log(`done. written ${made}, already present ${skipped}, failed ${failed.length}`)
  if (failed.length) {
    log(`failed trades (re-run to retry): ${failed.join(', ')}`)
  }
}

main().catch((e) => {
  console.error('generate-starter-catalogs failed', e)
  process.exit(1)
})
