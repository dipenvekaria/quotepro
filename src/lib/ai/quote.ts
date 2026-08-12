/**
 * AI quote generation, grounded on the company's own catalog.
 *
 * Ported from python-backend/ai_backend.py on 2026-08-11 (docs/adr/0009).
 *
 * Grounding is the whole game: a hallucinated line item is a price the
 * contractor is contractually on the hook for once the customer accepts. So
 * the model chooses *which* items and *how many*, and this module decides what
 * they cost — see `reconcile` below.
 */

import { query } from '@/lib/db'
import { Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'

export type CatalogItem = {
  id: string
  name: string
  description: string | null
  category: string | null
  base_price: number
  unit: string | null
}

export type AiLineItem = {
  name: string
  description: string | null
  quantity: number
  unit_price: number
  is_upsell: boolean
  is_discount: boolean
}

export type QuoteSource = { id: string; name: string }

export type GeneratedQuote = {
  line_items: AiLineItem[]
  tax_rate: number
  reasoning: string
  /** `gemini:<model>` or `mock` — the UI and production alerting both read it. */
  mode: string
  sources: QuoteSource[]
}

const DEFAULT_TAX_RATE = 8.5

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export async function fetchCatalog(companyId: string): Promise<CatalogItem[]> {
  return query<CatalogItem>(
    `select id, name, description, category, base_price, unit
       from catalog_items
      where company_id = $1 and is_active = true
      order by name
      limit 200`,
    [companyId],
  )
}

async function fetchTaxRate(companyId: string): Promise<number> {
  const rows = await query<{ tax_rate: number | null }>(
    `select (settings->>'tax_rate')::numeric as tax_rate
       from companies
      where id = $1`,
    [companyId],
  )
  const rate = rows[0]?.tax_rate
  return rate === null || rate === undefined ? DEFAULT_TAX_RATE : Number(rate)
}

// ---------------------------------------------------------------------------
// Mock generator — keyword-ranked catalog match
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'to', 'of', 'for', 'with', 'on', 'in', 'at', 'is',
  'are', 'we', 'our', 'please', 'need', 'want', 'would', 'like', 'install',
  'replace', 'new', 'job', 'customer',
])

function tokens(text: string): Set<string> {
  const found = text.toLowerCase().match(/[a-z0-9]+/g) ?? []
  return new Set(found.filter((t) => t.length > 2 && !STOPWORDS.has(t)))
}

function scoreItem(item: CatalogItem, q: Set<string>): number {
  const hay = tokens([item.name, item.description ?? '', item.category ?? ''].join(' '))
  let score = 0
  for (const t of q) if (hay.has(t)) score++
  return score
}

/**
 * Used when Gemini is unavailable or every model failed. Keeps the whole UI
 * exercisable offline and means a Gemini outage doesn't take quoting down.
 */
function mockGenerate(catalog: CatalogItem[], description: string) {
  const q = tokens(description)
  const ranked = catalog
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .sort((a, b) => b.score - a.score)

  let picks = ranked.filter((r) => r.score > 0).slice(0, 4).map((r) => r.item)
  if (picks.length === 0) {
    picks = catalog
      .filter((it) => ['labor', 'trip', 'diagnos'].some((k) => it.name.toLowerCase().includes(k)))
      .slice(0, 3)
  }

  const line_items: AiLineItem[] = picks.map((it, i) => ({
    name: it.name,
    description: it.description,
    quantity: it.name.toLowerCase().includes('labor') ? 2 : 1,
    unit_price: Number(it.base_price),
    is_upsell: i === picks.length - 1 && picks.length >= 3,
    is_discount: false,
  }))

  const reasoning =
    `Mock mode: matched ${line_items.length} catalog items on keywords ` +
    `${JSON.stringify([...q].sort().slice(0, 5))}.`

  return { line_items, reasoning, sources: picks.map((it) => ({ id: it.id, name: it.name })) }
}

// ---------------------------------------------------------------------------
// Real generator
// ---------------------------------------------------------------------------

const SYSTEM_FALLBACK = `You are a senior HVAC / trades estimator. Build a quote grounded ONLY on the catalog provided.

Rules:
- Use ONLY items from CATALOG. Do not invent items.
- Copy each item's name EXACTLY as written in the catalog.
- Include labor (typically 1-3 hrs), the primary equipment, and one upsell if it fits.
- Return valid JSON only. No markdown, no prose.`

const QUOTE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    line_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          is_upsell: { type: Type.BOOLEAN },
          is_discount: { type: Type.BOOLEAN },
        },
        required: ['name', 'quantity'],
      },
    },
    reasoning: { type: Type.STRING },
  },
  required: ['line_items', 'reasoning'],
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Catalog names carry punctuation the model does not reliably reproduce —
// "3-Ton AC Condenser — Carrier" comes back with a hyphen for the em-dash often
// enough to matter. Comparing letters and digits only stops a real item being
// dropped over a dash, which would silently under-quote the job.
function loosely(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

type RawLineItem = {
  name?: unknown
  description?: unknown
  quantity?: unknown
  is_upsell?: unknown
  is_discount?: unknown
}

/**
 * Match every returned item back to a real catalog row and take the price from
 * there, not from the model.
 *
 * The Python service trusted `unit_price` as returned, which meant a model that
 * misread the catalog could put a number in front of a customer that the
 * contractor never set. Prices now come from the database by construction, and
 * an item that matches nothing in the catalog is dropped rather than quoted.
 */
function reconcile(
  raw: RawLineItem[],
  catalog: CatalogItem[],
): { line_items: AiLineItem[]; sources: QuoteSource[] } {
  const byName = new Map(catalog.map((it) => [normalise(it.name), it]))
  const byLooseName = new Map(catalog.map((it) => [loosely(it.name), it]))

  const line_items: AiLineItem[] = []
  const sources: QuoteSource[] = []
  const seen = new Set<string>()
  const dropped: string[] = []

  for (const li of raw) {
    const name = typeof li.name === 'string' ? li.name.trim() : ''
    if (!name) continue

    const match = byName.get(normalise(name)) ?? byLooseName.get(loosely(name))
    if (!match) {
      dropped.push(name)
      continue
    }

    // Models sometimes emit the same catalog row twice. Keeping both bills the
    // customer twice for one thing — observed as "3 x Standard Labor" appearing
    // on consecutive lines. Keep the first and drop the rest rather than summing
    // the quantities, so a model slip can never inflate a quote.
    if (seen.has(match.id)) continue
    seen.add(match.id)

    const quantity = Number(li.quantity)
    line_items.push({
      name: match.name,
      description: typeof li.description === 'string' ? li.description : match.description,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit_price: Number(match.base_price),
      is_upsell: Boolean(li.is_upsell),
      is_discount: Boolean(li.is_discount),
    })
    sources.push({ id: match.id, name: match.name })
  }

  // A dropped item is a job the quote no longer covers, so it must not be
  // silent — an under-quote is as expensive as an over-quote, and it is the
  // signal that the catalog is missing something the contractor actually sells.
  if (dropped.length) {
    console.warn('ai/quote: dropped items with no catalog match', dropped)
  }

  return { line_items, sources }
}

async function realGenerate(
  catalog: CatalogItem[],
  description: string,
  customer: string | null,
  address: string | null,
) {
  const catalogText = catalog
    .slice(0, 80)
    .map(
      (c) =>
        `- ${c.name} | ${c.category || 'General'} | $${c.base_price}/${c.unit || 'each'} | ${c.description || ''}`,
    )
    .join('\n')

  const contents =
    `JOB DESCRIPTION:\n${description}\n\n` +
    `CUSTOMER: ${customer || 'Unknown'}\n` +
    `ADDRESS: ${address || 'Unknown'}\n\n` +
    `CATALOG:\n${catalogText}\n`

  const result = await generateJson({
    system: loadPrompt('quote-generation.md', SYSTEM_FALLBACK),
    contents,
    schema: QUOTE_SCHEMA,
  })
  if (!result) return null

  const data = result.data as { line_items?: unknown; reasoning?: unknown }
  const rawItems = Array.isArray(data.line_items) ? (data.line_items as RawLineItem[]) : []
  const { line_items, sources } = reconcile(rawItems, catalog)

  // Every item was invented. Better to fall through to keyword matching, which
  // at least returns real catalog rows, than to hand back an empty quote.
  if (line_items.length === 0) return null

  const reasoning =
    typeof data.reasoning === 'string' && data.reasoning.trim()
      ? data.reasoning.trim()
      : `Generated by ${result.model}.`

  return { line_items, reasoning, sources, model: result.model }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export class NoCatalogError extends Error {
  constructor() {
    super('No active catalog items for company')
    this.name = 'NoCatalogError'
  }
}

export async function generateQuote(input: {
  companyId: string
  description: string
  customerName?: string | null
  customerAddress?: string | null
}): Promise<GeneratedQuote> {
  const catalog = await fetchCatalog(input.companyId)
  if (catalog.length === 0) throw new NoCatalogError()

  const tax_rate = await fetchTaxRate(input.companyId)

  if (aiEnabled()) {
    const real = await realGenerate(
      catalog,
      input.description,
      input.customerName ?? null,
      input.customerAddress ?? null,
    )
    if (real) {
      return {
        line_items: real.line_items,
        tax_rate,
        reasoning: real.reasoning,
        mode: `gemini:${real.model}`,
        sources: real.sources,
      }
    }
  }

  const mock = mockGenerate(catalog, input.description)
  return { ...mock, tax_rate, mode: 'mock' }
}
