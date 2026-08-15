/**
 * Catalog extraction from a contractor's existing paperwork.
 *
 * Building the price book by hand is where onboarding dies across this whole
 * category — docs/PRODUCT_REVIEW.md §4 argues this is the feature that fixes
 * switching cost, and that no competitor has solved it. A contractor uploads an
 * old quote, an invoice or a photo of a rate card, and gets their price book.
 *
 * Nothing here writes to the catalog. Extraction returns rows for the
 * contractor to review, and saving goes through the same `importCatalogCsv`
 * path their own spreadsheet does. That review step is load-bearing: the model
 * is reading numbers off a photograph, and a misread price would otherwise
 * become what a customer is quoted.
 */

import { Type, aiEnabled, generateJson, type Schema } from '@/lib/ai/gemini'
import { loadPrompt } from '@/lib/ai/prompts'

/** What Gemini accepts inline. PDFs and phone photos cover the real cases. */
export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

/**
 * Inline request bodies are capped well below this by Gemini, and a phone photo
 * lands around 3-5MB. Base64 inflates by a third, so 12MB of file is roughly
 * 16MB on the wire.
 */
export const MAX_FILE_BYTES = 12 * 1024 * 1024

/** More than any single document a contractor will hand us in one go. */
const MAX_ITEMS = 300

export type ExtractedItem = {
  name: string
  description: string
  category: string
  unit: string
  price: number
}

export type ExtractionResult = {
  items: ExtractedItem[]
  documentType: string
  /** Something the contractor should check — an unreadable column, a cut-off page. */
  notes: string
  mode: string
}

const UNITS = ['each', 'hour', 'day', 'sq ft', 'linear ft', 'job', 'visit', 'ton', 'gallon']

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      // No `maxItems`. Gemini rejects the request outright with a bare
      // INVALID_ARGUMENT above some undocumented ceiling — '12' is accepted on
      // the quote schema, '300' is not — and a supplier price sheet legitimately
      // runs to hundreds of rows. The response is bounded by maxOutputTokens
      // and the list is capped in code below.
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          // No `enum` here. Gemini rejects the whole request with a bare
          // INVALID_ARGUMENT when one is present on this schema, and the value
          // is constrained by `cleanUnit` below regardless — the prompt lists
          // the allowed units, and anything else falls back to `each`.
          unit: { type: Type.STRING },
          price: { type: Type.NUMBER },
        },
        required: ['name', 'price'],
      },
    },
    document_type: { type: Type.STRING },
    notes: { type: Type.STRING },
  },
  required: ['items'],
}

const FALLBACK = `You are reading a trades contractor's paperwork and extracting the priced items so they can be loaded into a price book. Transcribe only — every price must appear on the document. If a price is unreadable, omit the item rather than guessing. Use unit prices, not line totals. Ignore totals, tax, discounts and payment terms. Return valid JSON only.`

function cleanUnit(raw: unknown): string {
  const u = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  return UNITS.includes(u) ? u : 'each'
}

function cleanText(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

/**
 * Reads a document and returns the priced items it contains.
 *
 * Rows without a usable name or a price above zero are dropped here rather than
 * shown to the contractor: the prompt asks the model to omit what it cannot
 * read, and anything that arrives at zero anyway is a misread, not a free item.
 */
export async function extractCatalogFromDocument(input: {
  data: Buffer
  mimeType: string
}): Promise<ExtractionResult> {
  if (!aiEnabled()) {
    return { items: [], documentType: '', notes: '', mode: 'mock' }
  }

  const result = await generateJson({
    system: loadPrompt('catalog-extraction.md', FALLBACK),
    contents: [
      { inlineData: { mimeType: input.mimeType, data: input.data.toString('base64') } },
      { text: 'Extract every priced item from this document.' },
    ],
    schema: SCHEMA,
    // Extraction is transcription. Any creativity here is a wrong price.
    temperature: 0,
    // A price sheet can carry hundreds of rows, and a truncated reply is a
    // parse failure rather than a short list.
    maxOutputTokens: 32768,
    // Reading a scanned price book is a harder problem than drafting a quote,
    // and it happens once per contractor. Measured on a real HCP HVAC book:
    // flash-lite 21 items, flash 42, pro 45.
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    budgetMs: 180_000,
  })

  if (!result) return { items: [], documentType: '', notes: '', mode: 'mock' }

  const data = result.data as {
    items?: unknown
    document_type?: unknown
    notes?: unknown
  }

  const raw = (Array.isArray(data.items) ? data.items : []).slice(0, MAX_ITEMS)
  const seen = new Set<string>()
  const items: ExtractedItem[] = []

  for (const r of raw as Record<string, unknown>[]) {
    const name = cleanText(r.name, 200)
    if (!name) continue

    const price = Number(r.price)
    // Zero is a misread, not a free service — the prompt asks for omission
    // instead, so anything arriving at zero failed that instruction.
    if (!Number.isFinite(price) || price <= 0) continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    items.push({
      name,
      description: cleanText(r.description, 500),
      category: cleanText(r.category, 100),
      unit: cleanUnit(r.unit),
      price: Math.round(price * 100) / 100,
    })
  }

  return {
    items,
    documentType: cleanText(data.document_type, 40),
    notes: cleanText(data.notes, 300),
    mode: `gemini:${result.model}`,
  }
}

/**
 * Serialises reviewed rows into the CSV shape `importCatalogCsv` already reads,
 * so extraction and a contractor's own spreadsheet land through one code path
 * with one set of validation and one error report.
 */
export function itemsToCsv(items: ExtractedItem[]): string {
  const cell = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = 'name,description,category,unit,price'
  const rows = items.map((i) =>
    [i.name, i.description, i.category, i.unit, i.price].map(cell).join(','),
  )
  return `${[head, ...rows].join('\n')}\n`
}
