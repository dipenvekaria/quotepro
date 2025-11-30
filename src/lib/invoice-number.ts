/**
 * Generate unique invoice number in format: INV-YYYY-NNNN
 * Example: INV-2025-0001
 */
export function generateInvoiceNumber(year: number, sequenceNumber: number): string {
  const paddedNumber = String(sequenceNumber).padStart(4, '0')
  return `INV-${year}-${paddedNumber}`
}

/**
 * Get next invoice number from database
 * Queries for highest invoice number in current year and increments
 */
export async function getNextInvoiceNumber(supabase: any): Promise<string> {
  const currentYear = new Date().getFullYear()
  const yearPrefix = `INV-${currentYear}-`

  // Get highest invoice number for current year
  const { data, error } = await supabase
    .from('quotes')
    .select('invoice_number')
    .like('invoice_number', `${yearPrefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (first invoice of the year)
    console.error('Error fetching invoice number:', error)
  }

  let sequenceNumber = 1

  if (data?.invoice_number) {
    // Extract sequence number from invoice like "INV-2025-0042"
    const match = data.invoice_number.match(/INV-\d{4}-(\d{4})/)
    if (match) {
      sequenceNumber = parseInt(match[1], 10) + 1
    }
  }

  return generateInvoiceNumber(currentYear, sequenceNumber)
}
