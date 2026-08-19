/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server-rendered PDFs via @react-pdf/renderer.
 *
 * IMPORTANT: PDF routes MUST export `runtime = 'nodejs'` because
 * @react-pdf/renderer depends on Node APIs that aren't available in Edge.
 */

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'

import { formatQuantity, unitSuffix } from '@/lib/format'

// ---------------------------------------------------------------------------
// Shared design tokens
// ---------------------------------------------------------------------------

const colors = {
  ink: '#111827',
  sub: '#6B7280',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  brand: '#4F46E5',
  brandTint: '#EEF2FF',
  emerald: '#059669',
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: colors.ink, fontSize: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandBadge: {
    width: 28,
    height: 28,
    backgroundColor: colors.brand,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadgeText: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 13 },
  companyName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: colors.ink },
  companyMeta: { fontSize: 9, color: colors.sub, marginTop: 1 },
  kickerRight: {
    fontSize: 8,
    color: colors.brand,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docNumber: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
    textAlign: 'right',
  },
  docDate: { fontSize: 9, color: colors.sub, textAlign: 'right', marginTop: 2 },
  hr: { borderBottomWidth: 1, borderBottomColor: colors.divider, marginVertical: 20 },
  addressBlock: { width: '48%' },
  addressLabel: {
    fontSize: 8,
    color: colors.sub,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  addressName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3, color: colors.ink },
  addressLine: { fontSize: 9, color: colors.sub, marginTop: 1 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },

  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    padding: 8,
    borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
    color: colors.sub,
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemsColItem: { width: '55%' },
  itemsColQty: { width: '10%', textAlign: 'right' },
  itemsColPrice: { width: '17%', textAlign: 'right' },
  itemsColTotal: { width: '18%', textAlign: 'right' },
  itemName: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  itemDescription: { fontSize: 9, color: colors.sub, marginTop: 2 },
  upsellPill: {
    marginTop: 3,
    alignSelf: 'flex-start',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: colors.brand,
    backgroundColor: colors.brandTint,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsBox: { marginTop: 12, marginLeft: 'auto', width: '40%' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsLabel: { fontSize: 10, color: colors.sub },
  totalsValue: { fontSize: 10, color: colors.ink },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    paddingTop: 6,
    marginTop: 6,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  grandTotalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },

  amountDueCard: {
    backgroundColor: colors.brandTint,
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  amountDueLabel: {
    fontSize: 8,
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  amountDueValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: colors.ink, marginTop: 2 },
  amountDueSub: { fontSize: 9, color: colors.sub, marginTop: 2 },

  paidBanner: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
    textAlign: 'center',
    color: colors.emerald,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },

  notesBox: { marginTop: 16, padding: 10, backgroundColor: colors.divider, borderRadius: 4 },
  notesLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.sub,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notesText: { fontSize: 9, color: colors.ink, marginTop: 4, lineHeight: 1.4 },

  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: colors.sub },
  footerBrand: { fontSize: 8, color: colors.sub },
})

// ---------------------------------------------------------------------------

type LineItem = {
  name: string
  description?: string | null
  quantity: number
  unit_price: number
  unit?: string | null
  is_upsell?: boolean
  is_discount?: boolean
}

type Company = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

type Customer = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

// ---------------------------------------------------------------------------
// Quote PDF
// ---------------------------------------------------------------------------

export type QuotePdfProps = {
  /** False on a paid plan — see src/lib/branding.ts. */
  showBadge?: boolean
  quoteNumber: string
  createdAt: Date
  expiresAt?: Date | null
  description?: string | null
  items: LineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  company: Company
  customer: Customer
  publicUrl?: string
  /** The company's own fine print; rendered verbatim after the totals. */
  terms?: string | null
  businessTaxId?: string | null
  /** Present once accepted — the signature block the customer signed. */
  signedBy?: string | null
  signedAt?: Date | null
}

function QuotePdf(props: QuotePdfProps): React.ReactElement {
  const nonDiscount = props.items.filter((i) => !i.is_discount)
  const discounts = props.items.filter((i) => i.is_discount)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandBox}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>
                {props.company.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.companyName}>{props.company.name}</Text>
              {props.company.phone ? (
                <Text style={styles.companyMeta}>{props.company.phone}</Text>
              ) : null}
              {props.company.email ? (
                <Text style={styles.companyMeta}>{props.company.email}</Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={styles.kickerRight}>Estimate</Text>
            <Text style={styles.docNumber}>{props.quoteNumber}</Text>
            <Text style={styles.docDate}>{props.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            {props.expiresAt ? (
              <Text style={styles.docDate}>Valid until {props.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.billRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Prepared for</Text>
            <Text style={styles.addressName}>{props.customer.name}</Text>
            {props.customer.address ? (
              <Text style={styles.addressLine}>{props.customer.address}</Text>
            ) : null}
            {props.customer.email ? (
              <Text style={styles.addressLine}>{props.customer.email}</Text>
            ) : null}
            {props.customer.phone ? (
              <Text style={styles.addressLine}>{props.customer.phone}</Text>
            ) : null}
          </View>
          {props.description ? (
            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>Scope</Text>
              <Text style={{ ...styles.addressLine, marginTop: 3 }}>{props.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ height: 20 }} />

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsColItem}>Item</Text>
          <Text style={styles.itemsColQty}>Qty</Text>
          <Text style={styles.itemsColPrice}>Price</Text>
          <Text style={styles.itemsColTotal}>Total</Text>
        </View>

        {nonDiscount.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemsColItem}>
              <Text style={styles.itemName}>{it.name}</Text>
              {it.description ? <Text style={styles.itemDescription}>{it.description}</Text> : null}
              {it.is_upsell ? <Text style={styles.upsellPill}>Recommended</Text> : null}
            </View>
            <Text style={{ ...styles.itemsColQty, fontSize: 10 }}>
              {formatQuantity(it.quantity, it.unit)}
            </Text>
            <Text style={{ ...styles.itemsColPrice, fontSize: 10 }}>
              {fmt(it.unit_price)}
              {unitSuffix(it.unit)}
            </Text>
            <Text style={{ ...styles.itemsColTotal, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
              {fmt(it.quantity * it.unit_price)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmt(props.subtotal)}</Text>
          </View>
          {discounts.map((d, i) => (
            <View key={i} style={styles.totalsRow}>
              <Text style={{ ...styles.totalsLabel, color: colors.emerald }}>{d.name}</Text>
              <Text style={{ ...styles.totalsValue, color: colors.emerald }}>
                -{fmt(d.quantity * d.unit_price)}
              </Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax ({props.taxRate}%)</Text>
            <Text style={styles.totalsValue}>{fmt(props.taxAmount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(props.total)}</Text>
          </View>
        </View>

        {props.businessTaxId ? (
          <Text style={{ marginTop: 10, fontSize: 8, color: colors.sub }}>
            Business / Tax # {props.businessTaxId}
          </Text>
        ) : null}

        {props.terms ? (
          <View style={{ marginTop: 18 }} break={props.terms.length > 1200}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.ink, marginBottom: 6 }}>
              Terms &amp; Conditions
            </Text>
            <Text style={{ fontSize: 8.5, lineHeight: 1.5, color: colors.sub }}>
              {props.terms}
            </Text>
          </View>
        ) : null}

        {props.signedBy ? (
          <View style={{ marginTop: 22 }} wrap={false}>
            <Text style={{ fontSize: 8.5, color: colors.sub, marginBottom: 14 }}>
              By signing this document, the customer agrees to the services and
              conditions outlined in this document.
            </Text>
            <View style={{ width: 220, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 5 }}>
              <Text style={{ fontSize: 10, color: colors.ink }}>{props.signedBy}</Text>
              {props.signedAt ? (
                <Text style={{ fontSize: 8, color: colors.sub, marginTop: 2 }}>
                  Accepted {props.signedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {props.publicUrl ? `Interactive: ${props.publicUrl}` : ''}
          </Text>
          {props.showBadge !== false && (
            <Text style={styles.footerBrand}>Powered by Rivet</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

export async function renderQuotePdf(props: QuotePdfProps): Promise<Buffer> {
  const buf = await renderToBuffer(QuotePdf(props) as any)
  return buf as Buffer
}

// ---------------------------------------------------------------------------
// Invoice PDF
// ---------------------------------------------------------------------------

export type InvoicePdfProps = {
  /** False on a paid plan — see src/lib/branding.ts. */
  showBadge?: boolean
  invoiceNumber: string
  createdAt: Date
  dueDate?: Date | null
  paidAt?: Date | null
  isPaid: boolean
  amountDue: number
  amountPaid: number
  description?: string | null
  items: LineItem[]
  subtotal: number
  taxAmount: number
  total: number
  company: Company
  customer: Customer
  publicUrl?: string
  notes?: string | null
}

function InvoicePdf(props: InvoicePdfProps): React.ReactElement {
  const nonDiscount = props.items.filter((i) => !i.is_discount)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandBox}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>
                {props.company.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.companyName}>{props.company.name}</Text>
              {props.company.phone ? (
                <Text style={styles.companyMeta}>{props.company.phone}</Text>
              ) : null}
              {props.company.email ? (
                <Text style={styles.companyMeta}>{props.company.email}</Text>
              ) : null}
            </View>
          </View>
          <View>
            <Text style={styles.kickerRight}>Invoice</Text>
            <Text style={styles.docNumber}>{props.invoiceNumber}</Text>
            <Text style={styles.docDate}>{props.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            {props.dueDate ? (
              <Text style={styles.docDate}>Due {props.dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.billRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLabel}>Bill to</Text>
            <Text style={styles.addressName}>{props.customer.name}</Text>
            {props.customer.address ? (
              <Text style={styles.addressLine}>{props.customer.address}</Text>
            ) : null}
            {props.customer.email ? (
              <Text style={styles.addressLine}>{props.customer.email}</Text>
            ) : null}
          </View>
          <View style={styles.addressBlock}>
            <View style={styles.amountDueCard}>
              <Text style={styles.amountDueLabel}>
                {props.isPaid ? 'Paid in full' : 'Amount due'}
              </Text>
              <Text style={styles.amountDueValue}>{fmt(props.isPaid ? props.total : props.amountDue)}</Text>
              {props.dueDate && !props.isPaid ? (
                <Text style={styles.amountDueSub}>
                  by {props.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
              {props.isPaid && props.paidAt ? (
                <Text style={styles.amountDueSub}>
                  on {props.paidAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ height: 16 }} />

        <View style={styles.itemsHeader}>
          <Text style={styles.itemsColItem}>Item</Text>
          <Text style={styles.itemsColQty}>Qty</Text>
          <Text style={styles.itemsColPrice}>Price</Text>
          <Text style={styles.itemsColTotal}>Total</Text>
        </View>

        {nonDiscount.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.itemsColItem}>
              <Text style={styles.itemName}>{it.name}</Text>
              {it.description ? <Text style={styles.itemDescription}>{it.description}</Text> : null}
            </View>
            <Text style={{ ...styles.itemsColQty, fontSize: 10 }}>
              {formatQuantity(it.quantity, it.unit)}
            </Text>
            <Text style={{ ...styles.itemsColPrice, fontSize: 10 }}>
              {fmt(it.unit_price)}
              {unitSuffix(it.unit)}
            </Text>
            <Text style={{ ...styles.itemsColTotal, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>
              {fmt(it.quantity * it.unit_price)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmt(props.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{fmt(props.taxAmount)}</Text>
          </View>
          {props.amountPaid > 0 && !props.isPaid ? (
            <View style={styles.totalsRow}>
              <Text style={{ ...styles.totalsLabel, color: colors.emerald }}>Paid</Text>
              <Text style={{ ...styles.totalsValue, color: colors.emerald }}>
                -{fmt(props.amountPaid)}
              </Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{props.isPaid ? 'Total' : 'Due'}</Text>
            <Text style={styles.grandTotalValue}>
              {fmt(props.isPaid ? props.total : props.amountDue)}
            </Text>
          </View>
        </View>

        {props.isPaid ? <Text style={styles.paidBanner}>Paid in full — thank you!</Text> : null}

        {props.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{props.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {props.publicUrl ? `Pay online: ${props.publicUrl}` : ''}
          </Text>
          {props.showBadge !== false && (
            <Text style={styles.footerBrand}>Powered by Rivet</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

export async function renderInvoicePdf(props: InvoicePdfProps): Promise<Buffer> {
  const buf = await renderToBuffer(InvoicePdf(props) as any)
  return buf as Buffer
}
