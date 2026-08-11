/**
 * A small RFC 4180-ish CSV reader.
 *
 * Written rather than pulled in because the requirement is narrow and the
 * failure modes are specific to where these files come from: a contractor
 * exporting their price book from Excel or Google Sheets. That means a UTF-8
 * BOM on the first cell, CRLF line endings, and quoted fields containing commas
 * ("Labor, after hours"). A `split(',')` gets all three wrong.
 */

/** Parses CSV text into rows of raw string cells. Blank lines are dropped. */
export function parseCsv(input: string): string[][] {
  // Excel prefixes exports with a BOM, which otherwise becomes part of the
  // first header and breaks column matching.
  const text = input.replace(/^﻿/, '')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"' // an escaped quote
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field === '') {
      // A quote only opens a field at its start. Treating a mid-field quote as
      // an opener — `3" copper pipe` — swallows every remaining row into one
      // giant field, so an unescaped inch mark would silently eat the import.
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      // Treat CRLF as one break rather than an empty row.
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)

  return rows
}

/**
 * Header aliases.
 *
 * Nobody's exported price book uses our column names, and asking a contractor
 * to rename headers before importing is exactly the friction this feature
 * exists to remove.
 */
const ALIASES: Record<'name' | 'base_price' | 'category' | 'description' | 'unit', string[]> = {
  name: ['name', 'item', 'item name', 'service', 'product', 'title', 'task'],
  base_price: ['price', 'base price', 'base_price', 'rate', 'cost', 'amount', 'unit price', 'charge'],
  category: ['category', 'type', 'group', 'section', 'trade'],
  description: ['description', 'details', 'notes', 'desc', 'summary'],
  unit: ['unit', 'uom', 'per', 'units', 'measure'],
}

function normalise(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

/** Maps a header row to column indexes. `name` and `base_price` are required. */
export function mapHeaders(header: string[]): Partial<Record<keyof typeof ALIASES, number>> {
  const found: Partial<Record<keyof typeof ALIASES, number>> = {}
  header.forEach((raw, index) => {
    const key = normalise(raw)
    for (const [field, aliases] of Object.entries(ALIASES) as [keyof typeof ALIASES, string[]][]) {
      if (found[field] === undefined && aliases.includes(key)) found[field] = index
    }
  })
  return found
}

/**
 * Reads a price, tolerating what spreadsheets actually contain.
 *
 * `$1,299.00`, `1 299,00`, `(50)` for negatives, and stray whitespace all show
 * up in real exports. Returns null when there is no number to find, so the
 * caller can report the row rather than silently importing a zero.
 */
export function parsePrice(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const negative = /^\(.*\)$/.test(trimmed)
  let cleaned = trimmed.replace(/^\(|\)$/g, '').replace(/[^0-9.,-]/g, '')

  // "1.299,00" (European) vs "1,299.00" — whichever separator comes last is the
  // decimal one.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    cleaned = cleaned.replace(/,/g, '')
  }

  // Stripping non-numerics from "TBD" leaves an empty string, and Number('')
  // is 0 — which would import a placeholder as free work.
  if (!/[0-9]/.test(cleaned)) return null

  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return negative ? -value : value
}
