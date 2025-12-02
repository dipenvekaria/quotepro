import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer'
import { renderToStream } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 5,
  },
  professionalQuote: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    color: '#0F172A',
    marginBottom: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    color: 'white',
    padding: 8,
    fontWeight: 'bold',
    marginTop: 20,
  },
  itemRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    padding: 8,
  },
  col1: { width: '50%' },
  col2: { width: '15%', textAlign: 'right' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #2563eb',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  signButton: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 10,
  },
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*),
        companies(*)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // @ts-ignore - Supabase typing
    const company = quote.companies
    // @ts-ignore - Supabase typing
    const items = quote.quote_items || []
    // @ts-ignore - Supabase typing
    const quoteData: any = quote

    const QuotePDF = (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>{company.name}</Text>
            <Text style={styles.professionalQuote}>Professional Quote</Text>
          </View>

          {/* Quote Info */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>QUOTE FOR</Text>
                <Text style={styles.value}>{quoteData.customer_name}</Text>
                {quoteData.customer_address && (
                  <>
                    <Text style={styles.label}>ADDRESS</Text>
                    <Text style={styles.value}>{quoteData.customer_address}</Text>
                  </>
                )}
                {quoteData.customer_phone && (
                  <>
                    <Text style={styles.label}>PHONE</Text>
                    <Text style={styles.value}>{quoteData.customer_phone}</Text>
                  </>
                )}
              </View>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>QUOTE NUMBER</Text>
                <Text style={styles.value}>{quoteData.quote_number}</Text>
                <Text style={styles.label}>DATE</Text>
                <Text style={styles.value}>
                  {new Date(quoteData.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {quoteData.description && (
            <View style={styles.section}>
              <Text style={styles.label}>JOB DESCRIPTION</Text>
              <Text style={styles.value}>{quoteData.description}</Text>
            </View>
          )}

          {/* Line Items */}
          <View style={styles.itemsHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Price</Text>
            <Text style={styles.col4}>Total</Text>
          </View>
          
          {items.map((item: { 
            name: string
            description?: string
            quantity: number
            unit_price: number
            total: number
          }, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.col1}>
                <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                {item.description && (
                  <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>${item.unit_price.toFixed(2)}</Text>
              <Text style={styles.col4}>${item.total.toFixed(2)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>${quoteData.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Tax ({quoteData.tax_rate}%):</Text>
              <Text>${quoteData.tax_amount.toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text>TOTAL:</Text>
              <Text>${quoteData.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes */}
          {quoteData.notes && (
            <View style={{ ...styles.section, marginTop: 30 }}>
              <Text style={styles.label}>NOTES</Text>
              <Text style={styles.value}>{quoteData.notes}</Text>
            </View>
          )}

          {/* Sign Button */}
          <View style={styles.signButton}>
            <Text>ACCEPT & SIGN THIS QUOTE</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
              We're local. We're licensed. We stand behind our work.
            </Text>
            {company.phone && <Text>Phone: {company.phone}</Text>}
            {company.email && <Text>Email: {company.email}</Text>}
          </View>
        </Page>
      </Document>
    )

    const stream = await renderToStream(QuotePDF)
    
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quote-${quoteData.quote_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
