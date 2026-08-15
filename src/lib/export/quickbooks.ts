/**
 * QuickBooks-shaped CSV exports.
 *
 * Contractors keep their books in QuickBooks, and without this every invoice
 * and payment gets re-keyed by hand at month end. That is the actual QuickBooks
 * ask — not a second payment processor, which changes nothing for the customer
 * paying.
 *
 * CSV rather than the Intuit API on purpose. It needs no OAuth, no per-tenant
 * token to refresh and revoke, and no exposure to an API that changes on
 * Intuit's schedule; it imports into QuickBooks Online *and* Desktop; and it
 * works today for a product that has not yet taken a live payment. When enough
 * contractors ask for a live sync, that is a different feature built on a
 * proven need.
 *
 * The column names below are the ones QuickBooks Online's import expects. They
 * are deliberately not prettified — matching the importer is the whole job.
 */

export type InvoiceExportRow = {
  invoice_number: string
  customer_name: string | null
  customer_email: string | null
  created_at: string
  due_date: string | null
  item_name: string | null
  item_description: string | null
  quantity: number | null
  unit_price: number | null
  line_total: number | null
  tax_amount: number
  invoice_total: number
}

export type PaymentExportRow = {
  invoice_number: string
  customer_name: string | null
  paid_at: string | null
  amount: number
  method: string | null
  reference_number: string | null
}

export type CustomerExportRow = {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

/**
 * One CSV field.
 *
 * A field beginning `=`, `+`, `-` or `@` is executed as a formula when the file
 * is opened in Excel or Sheets, which is how a customer name becomes a command
 * on the bookkeeper's machine. Prefixing with an apostrophe defuses it, and
 * QuickBooks strips the apostrophe on import.
 */
function field(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.map(field).join(','))]
  // CRLF: QuickBooks Desktop's importer is the fussier of the two.
  return lines.join('\r\n') + '\r\n'
}

/** `2026-08-15`, which is what both QuickBooks importers accept. */
function day(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? '' : n.toFixed(2))

/**
 * Invoices, one row per line item.
 *
 * QuickBooks groups consecutive rows sharing an invoice number into a single
 * invoice, so the header fields repeat on every line. That looks redundant and
 * is exactly what the importer wants.
 */
export function invoicesToCsv(rows: InvoiceExportRow[]): string {
  return toCsv(
    [
      'InvoiceNo',
      'Customer',
      'Email',
      'InvoiceDate',
      'DueDate',
      'Item',
      'ItemDescription',
      'ItemQuantity',
      'ItemRate',
      'ItemAmount',
      'TaxAmount',
      'InvoiceTotal',
    ],
    rows.map((r) => [
      r.invoice_number,
      r.customer_name,
      r.customer_email,
      day(r.created_at),
      day(r.due_date),
      r.item_name,
      r.item_description,
      r.quantity,
      money(r.unit_price),
      money(r.line_total),
      money(r.tax_amount),
      money(r.invoice_total),
    ]),
  )
}

export function paymentsToCsv(rows: PaymentExportRow[]): string {
  return toCsv(
    ['InvoiceNo', 'Customer', 'PaymentDate', 'Amount', 'PaymentMethod', 'ReferenceNo'],
    rows.map((r) => [
      r.invoice_number,
      r.customer_name,
      day(r.paid_at),
      money(r.amount),
      r.method,
      r.reference_number,
    ]),
  )
}

export function customersToCsv(rows: CustomerExportRow[]): string {
  return toCsv(
    ['Name', 'Email', 'Phone', 'BillingAddressLine1', 'BillingCity', 'BillingState', 'BillingPostalCode'],
    rows.map((r) => [r.name, r.email, r.phone, r.address, r.city, r.state, r.zip]),
  )
}
