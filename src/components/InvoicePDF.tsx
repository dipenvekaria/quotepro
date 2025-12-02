import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { format } from 'date-fns'

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
    borderBottomColor: '#2563eb',
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
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 4,
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#FFF5F0',
    borderRadius: 4,
  },
  detailColumn: {
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
  customerSection: {
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
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 10,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'right',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 250,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalValue: {
    fontSize: 10,
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
    borderRadius: 4,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
  },
  paymentInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  paidStamp: {
    position: 'absolute',
    top: 100,
    right: 40,
    padding: 10,
    borderWidth: 3,
    borderColor: '#22C55E',
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  paidText: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#22C55E',
    textTransform: 'uppercase',
  },
})

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface InvoicePDFProps {
  quote: {
    id: string
    quote_number: string
    invoice_number: string
    customer_name: string
    customer_email?: string
    customer_phone?: string
    customer_address?: string
    description: string
    subtotal: number
    tax_rate: number
    tax_amount: number
    total: number
    completed_at: string
    paid_at?: string
    payment_method?: string
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
  items: InvoiceItem[]
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ quote, company, items }) => {
  const completedDate = new Date(quote.completed_at)
  const dueDate = new Date(completedDate)
  dueDate.setDate(dueDate.getDate() + 14) // 14 days payment terms

  const isPaid = !!quote.paid_at

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logo_url && (
              <Image src={company.logo_url} style={styles.logo} />
            )}
            {!company.logo_url && (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.license && <Text>License: {company.license}</Text>}
            {company.phone && <Text>{company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
            {company.website && <Text>{company.website}</Text>}
            {company.address && <Text>{company.address}</Text>}
          </View>
        </View>

        {/* PAID Stamp */}
        {isPaid && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidText}>PAID</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>INVOICE</Text>
        
        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.detailColumn}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{quote.invoice_number}</Text>
            <Text style={styles.label}>Quote Number</Text>
            <Text style={styles.value}>{quote.quote_number}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.label}>Invoice Date</Text>
            <Text style={styles.value}>{format(completedDate, 'MMM d, yyyy')}</Text>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{format(dueDate, 'MMM d, yyyy')}</Text>
          </View>
          {isPaid && (
            <View style={styles.detailColumn}>
              <Text style={styles.label}>Paid Date</Text>
              <Text style={styles.value}>{format(new Date(quote.paid_at!), 'MMM d, yyyy')}</Text>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{quote.payment_method || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Bill To */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.value}>{quote.customer_name}</Text>
          {quote.customer_address && <Text style={styles.value}>{quote.customer_address}</Text>}
          {quote.customer_email && <Text style={styles.value}>{quote.customer_email}</Text>}
          {quote.customer_phone && <Text style={styles.value}>{quote.customer_phone}</Text>}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>${item.unit_price.toFixed(2)}</Text>
              <Text style={styles.colTotal}>${item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Job Description */}
        {quote.description && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.value}>{quote.description}</Text>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${quote.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({quote.tax_rate}%)</Text>
            <Text style={styles.totalValue}>${quote.tax_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>
              {isPaid ? 'Total Paid' : 'Amount Due'}
            </Text>
            <Text style={styles.grandTotalValue}>${quote.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        {!isPaid && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <Text style={styles.paymentText}>
              Payment is due within 14 days of invoice date.
            </Text>
            <Text style={styles.paymentText}>
              Click the "Pay Now" button in your email to pay securely online.
            </Text>
            <Text style={styles.paymentText}>
              We accept credit cards, debit cards, Apple Pay, and Google Pay.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
          {company.email && <Text>{company.email} • {company.phone}</Text>}
        </View>
      </Page>
    </Document>
  )
}
