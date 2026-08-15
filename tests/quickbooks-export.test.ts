import { describe, expect, it } from 'vitest'

import {
  customersToCsv,
  invoicesToCsv,
  paymentsToCsv,
} from '@/lib/export/quickbooks'

/**
 * The file lands in a bookkeeper's spreadsheet, so the risks are not aesthetic:
 * a field that Excel executes, a quote that breaks the row, a date QuickBooks
 * rejects.
 */

const invoice = {
  invoice_number: 'INV-1001',
  customer_name: 'Acme Ltd',
  customer_email: 'ap@acme.test',
  created_at: '2026-08-15T10:00:00.000Z',
  due_date: '2026-09-14T10:00:00.000Z',
  item_name: 'Condenser',
  item_description: 'Install',
  quantity: 2,
  unit_price: 1650,
  line_total: 3300,
  tax_amount: 280.5,
  invoice_total: 3580.5,
}

describe('invoice export', () => {
  it('uses the headers QuickBooks imports', () => {
    const [header] = invoicesToCsv([invoice]).split('\r\n')
    expect(header).toBe(
      'InvoiceNo,Customer,Email,InvoiceDate,DueDate,Item,ItemDescription,ItemQuantity,ItemRate,ItemAmount,TaxAmount,InvoiceTotal',
    )
  })

  it('writes dates as YYYY-MM-DD, not an ISO timestamp', () => {
    expect(invoicesToCsv([invoice])).toContain('2026-08-15,2026-09-14')
  })

  it('writes money to two decimals so a total never reads as 3580.5', () => {
    expect(invoicesToCsv([invoice])).toContain('3580.50')
  })

  it('repeats the invoice header on every line, which is how QuickBooks groups them', () => {
    const rows = invoicesToCsv([invoice, { ...invoice, item_name: 'Labour', line_total: 280 }])
      .trim()
      .split('\r\n')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toContain('INV-1001')
    expect(rows[2]).toContain('INV-1001')
  })

  it('ends lines with CRLF for the Desktop importer', () => {
    expect(invoicesToCsv([invoice])).toContain('\r\n')
  })
})

describe('the file is safe to open', () => {
  it('defuses a formula in a customer name', () => {
    // A contractor's own customer list is attacker-controlled text as far as a
    // spreadsheet is concerned: =cmd|'/c calc'!A1 runs on open.
    const csv = customersToCsv([
      { name: '=cmd|\'/c calc\'!A1', email: null, phone: null, address: null, city: null, state: null, zip: null },
    ])
    expect(csv).toContain("'=cmd")
    expect(csv.split('\r\n')[1].startsWith('=')).toBe(false)
  })

  it('defuses the other three formula leaders', () => {
    for (const lead of ['+', '-', '@']) {
      const csv = customersToCsv([
        { name: `${lead}danger`, email: null, phone: null, address: null, city: null, state: null, zip: null },
      ])
      expect(csv.split('\r\n')[1].startsWith(lead)).toBe(false)
    }
  })

  it('quotes a field containing a comma so the row does not shift', () => {
    const csv = customersToCsv([
      { name: 'Smith, John', email: null, phone: null, address: null, city: null, state: null, zip: null },
    ])
    expect(csv).toContain('"Smith, John"')
  })

  it('escapes an embedded quote rather than truncating the field', () => {
    const csv = customersToCsv([
      { name: 'The "Big" Co', email: null, phone: null, address: null, city: null, state: null, zip: null },
    ])
    expect(csv).toContain('"The ""Big"" Co"')
  })

  it('writes an empty cell for a missing value, never the word null', () => {
    const csv = customersToCsv([
      { name: 'No Contact', email: null, phone: null, address: null, city: null, state: null, zip: null },
    ])
    expect(csv).not.toContain('null')
    expect(csv.split('\r\n')[1]).toBe('No Contact,,,,,,')
  })
})

describe('payment export', () => {
  it('carries the reference a bookkeeper reconciles against', () => {
    const csv = paymentsToCsv([
      {
        invoice_number: 'INV-1001',
        customer_name: 'Acme Ltd',
        paid_at: '2026-08-16T09:00:00.000Z',
        amount: 3580.5,
        method: 'card',
        reference_number: 'ch_123',
      },
    ])
    expect(csv).toContain('INV-1001,Acme Ltd,2026-08-16,3580.50,card,ch_123')
  })
})
