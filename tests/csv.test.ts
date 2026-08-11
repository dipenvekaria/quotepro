import { describe, expect, it } from 'vitest'

import { mapHeaders, parseCsv, parsePrice } from '../src/lib/csv'

/**
 * These cases are what a contractor's exported price book actually looks like,
 * not what a well-formed CSV looks like. Every one of them is a way the import
 * silently mangles someone's pricing if it is wrong.
 */
describe('parseCsv', () => {
  it('reads a simple file', () => {
    expect(parseCsv('name,price\nLabor,125')).toEqual([
      ['name', 'price'],
      ['Labor', '125'],
    ])
  })

  it('keeps commas inside quoted fields', () => {
    // "Labor, after hours" must stay one cell, not become two columns and shift
    // every price one to the left.
    const rows = parseCsv('name,price\n"Labor, after hours",195')
    expect(rows[1]).toEqual(['Labor, after hours', '195'])
  })

  it('handles escaped quotes', () => {
    const rows = parseCsv('name\n"3"" copper pipe"')
    expect(rows[1]).toEqual(['3" copper pipe'])
  })

  it('handles CRLF, which is what Excel writes', () => {
    expect(parseCsv('name,price\r\nLabor,125\r\n')).toEqual([
      ['name', 'price'],
      ['Labor', '125'],
    ])
  })

  it('strips the UTF-8 BOM Excel prefixes exports with', () => {
    // Without this the first header is "﻿name" and never matches.
    const rows = parseCsv('﻿name,price\nLabor,125')
    expect(rows[0][0]).toBe('name')
  })

  it('drops blank lines rather than importing empty items', () => {
    expect(parseCsv('name,price\n\nLabor,125\n\n')).toHaveLength(2)
  })

  it('treats a mid-field quote as a literal, not an opener', () => {
    // An unescaped inch mark — 3" copper pipe — used to put the reader into
    // quote mode and swallow every remaining row into one field.
    const rows = parseCsv('name,price\n3" copper pipe,12.50\nElbow,3.25')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toEqual(['3" copper pipe', '12.50'])
    expect(rows[2]).toEqual(['Elbow', '3.25'])
  })

  it('keeps embedded newlines inside quotes', () => {
    const rows = parseCsv('name,description\nLabor,"line one\nline two"')
    expect(rows[1][1]).toBe('line one\nline two')
  })
})

describe('mapHeaders', () => {
  it('matches our own template', () => {
    expect(mapHeaders(['name', 'price', 'category', 'description'])).toEqual({
      name: 0,
      base_price: 1,
      category: 2,
      description: 3,
    })
  })

  it('matches the words other people use', () => {
    const m = mapHeaders(['Item Name', 'Unit Price', 'Trade', 'UOM'])
    expect(m.name).toBe(0)
    expect(m.base_price).toBe(1)
    expect(m.category).toBe(2)
    expect(m.unit).toBe(3)
  })

  it('ignores case, underscores and stray spacing', () => {
    const m = mapHeaders(['  NAME  ', 'BASE_PRICE'])
    expect(m).toEqual({ name: 0, base_price: 1 })
  })

  it('reports missing required columns by omission', () => {
    expect(mapHeaders(['sku', 'colour']).name).toBeUndefined()
  })

  it('keeps the first match when a header appears twice', () => {
    expect(mapHeaders(['name', 'item']).name).toBe(0)
  })
})

describe('parsePrice', () => {
  it('reads plain numbers', () => {
    expect(parsePrice('125')).toBe(125)
    expect(parsePrice('149.99')).toBe(149.99)
  })

  it('strips currency symbols and thousands separators', () => {
    expect(parsePrice('$1,299.00')).toBe(1299)
    expect(parsePrice(' £89.50 ')).toBe(89.5)
  })

  it('reads European decimal commas', () => {
    // 1.299,00 must not become 1.29900
    expect(parsePrice('1.299,00')).toBe(1299)
    expect(parsePrice('89,50')).toBe(89.5)
  })

  it('reads accounting-style negatives', () => {
    expect(parsePrice('(50.00)')).toBe(-50)
  })

  it('returns null when there is no number, rather than zero', () => {
    // Importing a blank or "TBD" as $0.00 would put free work on a quote.
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('TBD')).toBeNull()
    expect(parsePrice('   ')).toBeNull()
  })
})
