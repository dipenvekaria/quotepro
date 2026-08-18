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
import { searchCatalog } from '@/lib/ai/catalog-index'
import { AiUnavailableError, Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
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
  /** The catalog item's unit, carried so 3 tons never renders as 3 condensers. */
  unit: string | null
  is_upsell: boolean
  is_discount: boolean
}

export type QuoteSource = { id: string; name: string }

export type GeneratedQuote = {
  line_items: AiLineItem[]
  tax_rate: number
  reasoning: string
  /** Always `gemini:<model>` — an unavailable model throws AiUnavailableError instead. */
  mode: string
  /** Token counts when the model reported them, so a quote's cost is answerable. */
  usage?: { input: number; output: number }
  sources: QuoteSource[]
  /** Asked when the description left a choice that changes the quote. */
  questions: { question: string; options: string[] }[]
  /** Work the description called for that the catalog cannot cover. */
  unmet: string[]
}

const DEFAULT_TAX_RATE = 8.5

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * The items a quote may be built from.
 *
 * Narrowed to the company's trade when it has one, so a plumber's quote is
 * never grounded on roofing items. Items with no trade are always eligible —
 * that is everything the contractor added by hand or imported themselves, and
 * excluding their own price book would be the worse failure by far.
 */
export async function fetchCatalog(companyId: string): Promise<CatalogItem[]> {
  return query<CatalogItem>(
    `select ci.id, ci.name, ci.description, ci.category, ci.base_price, ci.unit
       from catalog_items ci
       join companies c on c.id = ci.company_id
      where ci.company_id = $1
        and ci.is_active = true
        and (c.trade is null or ci.trade is null or ci.trade = c.trade)
      order by ci.name
      limit 200`,
    [companyId],
  )
}

/** How many catalog items the model is shown. The same budget the old
 * alphabetical slice used — the fix is *which* items fill it, not how many. */
const GROUNDING_CAP = 80
/** How many search hits lead the set before the alphabetical fill. */
const GROUNDING_SEARCH = 40

/**
 * Order the grounding set: search hits first, alphabetical fill after.
 *
 * Pure and exported for tests. `hits` may contain ids the catalog fetch did
 * not return (inactive, off-trade) — those are dropped, never invented.
 */
export function mergeGrounding<T extends { id: string }>(
  hits: { id: string }[],
  all: T[],
  cap: number,
): T[] {
  const byId = new Map(all.map((it) => [it.id, it]))
  const out: T[] = []
  const used = new Set<string>()
  for (const h of hits) {
    const item = byId.get(h.id)
    if (!item || used.has(item.id)) continue
    used.add(item.id)
    out.push(item)
    if (out.length >= cap) return out
  }
  for (const item of all) {
    if (used.has(item.id)) continue
    out.push(item)
    if (out.length >= cap) break
  }
  return out
}

/**
 * The items the model is shown for this request.
 *
 * The old behaviour was `catalog.slice(0, 80)` — the first eighty rows
 * **alphabetically**. Any real price book is bigger, so everything from
 * roughly S onward was invisible to the model: a 102-item catalog quoted
 * "smart thermostat" as the Programmable one for days because the Smart
 * Thermostat sat at position 83 and the model had never seen it. Relevance
 * picks the leaders now; the alphabetical fill keeps the set no narrower than
 * it ever was, so a weak search can not make anything worse than before.
 */
export async function groundingCatalog(
  companyId: string,
  description: string,
  catalog: CatalogItem[],
): Promise<CatalogItem[]> {
  if (catalog.length <= GROUNDING_CAP) return catalog
  const hits = await searchCatalog(companyId, description, GROUNDING_SEARCH)
  return mergeGrounding(hits, catalog, GROUNDING_CAP)
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
// Generator
//
// There is deliberately no mock or keyword fallback. The one that lived here
// fabricated $786 of labour lines for a gibberish description, and a quota
// exhaustion once shipped keyword-matched quotes for days looking like poor AI
// quality rather than an outage. A visible failure gets fixed; a plausible
// substitute gets sent to a customer. Standing rule: fail hard.
// ---------------------------------------------------------------------------

const QUOTE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    line_items: {
      type: Type.ARRAY,
      // A real quote is a handful of lines. Without a ceiling the model has
      // walked the whole catalog into the response.
      maxItems: '12',
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
        // is_discount is required so the model has to decide rather than omit.
        // Left optional, it wrote a line named "10% discount" with the flag
        // unset, which reconcile then dropped for having no catalog row — the
        // discount vanished and the contractor was told it was missing from
        // their price book.
        required: ['name', 'quantity', 'is_discount'],
      },
    },
    // Asked when the description leaves a choice that changes the quote. The
    // alternative the model reached for otherwise was to guess confidently.
    questions: {
      type: Type.ARRAY,
      maxItems: '3',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          // Capped: asked for 2-4 in prose and got nine back, which is a list
          // to read rather than a choice to make.
          options: { type: Type.ARRAY, maxItems: '4', items: { type: Type.STRING } },
        },
        required: ['question', 'options'],
      },
    },
    // Work the description asked for that the catalog cannot cover. Naming it
    // is what stops the model assembling a plausible substitute — and it is
    // also the clearest signal a contractor gets that their price book has a
    // hole in it.
    unmet: { type: Type.ARRAY, maxItems: '5', items: { type: Type.STRING } },
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
  /**
   * Read for discount lines only. Every other price comes from the catalog row —
   * see the note in reconcile() for why a discount is the one safe exception.
   */
  unit_price?: unknown
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

    /*
      A discount is not a catalog item, so it cannot be matched against one.

      Everything below exists to stop the model inventing work the business does
      not sell. A discount is the opposite: an adjustment to work already on the
      quote, at a price the contractor is *reducing*. Dropping it for having no
      catalog row — and then reporting "$19 discount" under "not in your price
      book", which is what a contractor actually saw — is the rule firing on the
      one case it was never meant to catch.

      The price is taken from the model here, unlike every other line. That is
      safe in the one direction that matters: a wrong discount can only ever
      quote *less* than the catalog says, which is a mistake the contractor can
      see on their own quote, not one the customer discovers later.
    */
    // A negative price is a discount definitionally — `catalog_items.base_price`
    // carries CHECK (base_price >= 0), so nothing the business sells can come
    // back below zero. Checking the number as well as the flag means a model
    // that describes a discount correctly but forgets to label it still lands
    // in the right place.
    const priced = Number(li.unit_price)
    if (li.is_discount || (Number.isFinite(priced) && priced < 0)) {
      const amount = Math.abs(priced)
      if (!Number.isFinite(amount) || amount === 0) continue
      line_items.push({
        name,
        description: typeof li.description === 'string' ? li.description : null,
        quantity: 1,
        unit_price: -amount,
        unit: null,
        is_upsell: false,
        is_discount: true,
      })
      continue
    }

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
      unit: match.unit,
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
  grounded: CatalogItem[],
  description: string,
  customer: string | null,
  address: string | null,
) {
  const catalogText = grounded
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
    system: loadPrompt('quote-generation.md'),
    contents,
    schema: QUOTE_SCHEMA,
  })
  if (!result) return null

  const data = result.data as {
    line_items?: unknown
    reasoning?: unknown
    questions?: unknown
    unmet?: unknown
  }
  const rawItems = Array.isArray(data.line_items) ? (data.line_items as RawLineItem[]) : []
  const { line_items, sources } = reconcile(rawItems, catalog)

  const questions = Array.isArray(data.questions)
    ? (data.questions as { question?: unknown; options?: unknown }[])
        .filter((q) => typeof q.question === 'string' && Array.isArray(q.options))
        .map((q) => ({
          question: q.question as string,
          // Enforced here too — the schema limit is advisory and was ignored.
          options: (q.options as unknown[])
            .filter((o): o is string => typeof o === 'string')
            .slice(0, 4),
        }))
        .filter((q) => q.options.length >= 2)
        .slice(0, 3)
    : []

  const unmet = Array.isArray(data.unmet)
    ? (data.unmet as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 5)
    : []

  // No items is now a legitimate answer — the catalog genuinely could not cover
  // the job, and the model said so. Falling through to keyword matching there
  // would replace an honest "we don't do that" with a confident wrong quote,
  // which is the failure this whole change exists to stop.
  if (line_items.length === 0 && questions.length === 0 && unmet.length === 0) return null

  const reasoning =
    typeof data.reasoning === 'string' && data.reasoning.trim()
      ? data.reasoning.trim()
      : `Generated by ${result.model}.`

  return { line_items, reasoning, sources, model: result.model, usage: result.usage, questions, unmet }
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

  if (!aiEnabled()) {
    throw new AiUnavailableError('no Gemini credentials are configured')
  }

  const grounded = await groundingCatalog(input.companyId, input.description, catalog)
  const real = await realGenerate(
    catalog,
    grounded,
    input.description,
    input.customerName ?? null,
    input.customerAddress ?? null,
  )
  if (!real) {
    // Every model in the chain failed, or the response was empty with nothing
    // to say. No keyword substitute — see the note at the top of this section.
    throw new AiUnavailableError('every model failed or returned nothing')
  }

  return {
    line_items: real.line_items,
    tax_rate,
    reasoning: real.reasoning,
    mode: `gemini:${real.model}`,
    usage: real.usage,
    sources: real.sources,
    questions: real.questions,
    unmet: real.unmet,
  }
}
