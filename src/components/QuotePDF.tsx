import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer'

// Using Helvetica (built-in PDF font) for maximum compatibility
// No external font loading = faster generation + better compatibility with all PDF readers
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6200',
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#666666',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  quoteNumber: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  customerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerColumn: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#1a1a1a',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    padding: 8,
    minHeight: 35,
  },
  tableRowUpsell: {
    backgroundColor: '#FFF5F0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6200',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 0.7,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  itemName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 8,
    color: '#666666',
    lineHeight: 1.4,
  },
  upsellBadge: {
    backgroundColor: '#FF6200',
    color: '#FFFFFF',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tierSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  tierPrice: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#FF6200',
  },
  tierBadge: {
    backgroundColor: '#FF6200',
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#FF6200',
  },
  photoSection: {
    marginTop: 25,
    marginBottom: 25,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photo: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    borderRadius: 8,
    marginBottom: 15,
  },
  photoCaption: {
    fontSize: 9,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  signButton: {
    backgroundColor: '#FF6200',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666666',
  },
  footerColumn: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 7,
    color: '#999999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 8,
    color: '#666666',
  },
  notesSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.5,
  },
})

interface QuoteItem {
  name: string
  description?: string
  quantity: number
  unit_price: number
  total: number
  option_tier?: string
  is_upsell?: boolean
}

interface QuotePDFProps {
  quote: {
    id: string
    quote_number: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    customer_address?: string
    description: string
    subtotal: number
    tax_rate: number
    tax_amount: number
    total: number
    notes?: string
    created_at: string
    photos?: string[]
  }
  company: {
    name: string
    logo_url?: string
    license?: string
    phone?: string
    email?: string
    website?: string
    address?: string
  }
  items: QuoteItem[]
  signUrl?: string
}

export const QuotePDF: React.FC<QuotePDFProps> = ({ quote, company, items, signUrl }) => {
  // Group items by tier for Good/Better/Best display
  const tiers = items.reduce((acc, item) => {
    const tier = item.option_tier || 'standard'
    if (!acc[tier]) acc[tier] = []
    acc[tier].push(item)
    return acc
  }, {} as Record<string, QuoteItem[]>)

  const hasTiers = Object.keys(tiers).length > 1

  // Calculate tier totals
  const tierTotals = Object.entries(tiers).reduce((acc, [tier, tierItems]) => {
    const subtotal = tierItems.reduce((sum, item) => sum + item.total, 0)
    const taxAmount = subtotal * (quote.tax_rate / 100)
    const total = subtotal + taxAmount
    acc[tier] = { subtotal, taxAmount, total }
    return acc
  }, {} as Record<string, { subtotal: number; taxAmount: number; total: number }>)

  const tierNames: Record<string, string> = {
    good: 'Good',
    better: 'Better',
    best: 'Best',
    standard: 'Standard Package',
  }

  const renderItemsTable = (tierItems: QuoteItem[], showTier = false) => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.colDescription}>Description</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colPrice}>Unit Price</Text>
        <Text style={styles.colTotal}>Total</Text>
      </View>
      {tierItems.map((item, index) => (
        <View
          key={index}
          style={[
            styles.tableRow,
            ...(item.is_upsell ? [styles.tableRowUpsell] : []),
          ]}
        >
          <View style={styles.colDescription}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            {item.is_upsell && (
              <Text style={styles.upsellBadge}>UPGRADE</Text>
            )}
          </View>
          <Text style={styles.colQty}>{item.quantity}</Text>
          <Text style={styles.colPrice}>${item.unit_price.toFixed(2)}</Text>
          <Text style={styles.colTotal}>${item.total.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.phone && <Text>{company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
            {company.website && <Text>{company.website}</Text>}
            {company.license && <Text>License #{company.license}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Quote</Text>
        <Text style={styles.quoteNumber}>Quote #{quote.quote_number}</Text>
        <Text style={styles.quoteNumber}>
          Date: {new Date(quote.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerDetails}>
            <View style={styles.customerColumn}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.value}>{quote.customer_name}</Text>
              {quote.customer_email && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{quote.customer_email}</Text>
                </>
              )}
            </View>
            <View style={styles.customerColumn}>
              {quote.customer_phone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{quote.customer_phone}</Text>
                </>
              )}
              {quote.customer_address && (
                <>
                  <Text style={styles.label}>Job Address</Text>
                  <Text style={styles.value}>{quote.customer_address}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Description</Text>
          <Text style={styles.value}>{quote.description}</Text>
        </View>

        {/* Items - Either tiered or single table */}
        {hasTiers ? (
          // Good/Better/Best Format
          <>
            <Text style={styles.sectionTitle}>Package Options</Text>
            {Object.entries(tiers).map(([tier, tierItems]) => (
              <View key={tier} style={styles.tierSection}>
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={styles.tierTitle}>{tierNames[tier] || tier}</Text>
                    <Text style={styles.label}>
                      {tierItems.length} {tierItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  <Text style={styles.tierPrice}>
                    ${tierTotals[tier].total.toFixed(2)}
                  </Text>
                </View>
                {renderItemsTable(tierItems, true)}
                <View style={styles.totalsSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>
                      ${tierTotals[tier].subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                      Tax ({quote.tax_rate.toFixed(2)}%)
                    </Text>
                    <Text style={styles.totalValue}>
                      ${tierTotals[tier].taxAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>Total</Text>
                    <Text style={styles.grandTotalValue}>
                      ${tierTotals[tier].total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : (
          // Single Table Format
          <>
            <Text style={styles.sectionTitle}>Items</Text>
            {renderItemsTable(items)}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${quote.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax ({quote.tax_rate.toFixed(2)}%)
                </Text>
                <Text style={styles.totalValue}>${quote.tax_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>${quote.total.toFixed(2)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Photos */}
        {quote.photos && quote.photos.length > 0 && (
          <View style={styles.photoSection} break>
            <Text style={styles.sectionTitle}>Job Site Photos</Text>
            {quote.photos.map((photo, index) => (
              <View key={index}>
                <Image src={photo} style={styles.photo} />
                <Text style={styles.photoCaption}>Photo {index + 1}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Sign Button */}
        {signUrl && (
          <Link src={signUrl}>
            <Text style={styles.signButton}>
              ✓ ACCEPT & SIGN ONLINE
            </Text>
          </Link>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerColumn}>
            <Text style={styles.footerLabel}>Company</Text>
            <Text style={styles.footerValue}>{company.name}</Text>
            {company.address && <Text style={styles.footerValue}>{company.address}</Text>}
          </View>
          <View style={styles.footerColumn}>
            <Text style={styles.footerLabel}>Contact</Text>
            {company.phone && <Text style={styles.footerValue}>{company.phone}</Text>}
            {company.email && <Text style={styles.footerValue}>{company.email}</Text>}
          </View>
          <View style={styles.footerColumn}>
            {company.license && (
              <>
                <Text style={styles.footerLabel}>License</Text>
                <Text style={styles.footerValue}>#{company.license}</Text>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
