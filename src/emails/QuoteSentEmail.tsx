import * as React from 'react'
import { Section, Text, Heading, Row, Column, Hr } from '@react-email/components'
import { EmailLayout } from './components/EmailLayout'
import { EmailHeader } from './components/EmailHeader'
import { EmailFooter } from './components/EmailFooter'
import { EmailButton } from './components/EmailButton'

interface QuoteItem {
  name: string
  quantity: number
  price: string
}

interface QuoteSentEmailProps {
  companyName?: string
  logoUrl?: string | null
  customerName: string
  quoteNumber: string
  total: string
  publicLink: string
  pdfUrl?: string
  validUntil: string
  items: QuoteItem[]
}

export function QuoteSentEmail({
  companyName,
  logoUrl,
  customerName,
  quoteNumber,
  total,
  publicLink,
  pdfUrl,
  validUntil,
  items,
}: QuoteSentEmailProps) {
  return (
    <EmailLayout>
      <EmailHeader companyName={companyName} logoUrl={logoUrl} />
      
      <Section style={content}>
        <Heading style={h1}>
          {companyName ? `Your quote from ${companyName}` : 'Your quote'}
        </Heading>

        <Text style={greeting}>Hi {customerName.trim()},</Text>

        <Text style={paragraph}>
          Here&rsquo;s the quote you asked for. Everything is itemised below, and you can
          review and approve it online — no account needed.
        </Text>

        <Section style={quoteBox}>
          <Text style={quoteLabel}>Quote #{quoteNumber}</Text>
          <Text style={validText}>Valid until {validUntil}</Text>
        </Section>

        <Section style={tableSection}>
          <Row style={tableHeader}>
            <Column style={tableHeaderCell}>Item</Column>
            <Column style={tableHeaderCellRight}>Qty</Column>
            <Column style={tableHeaderCellRight}>Price</Column>
          </Row>
          {items.map((item, index) => (
            <Row key={index} style={tableRow}>
              <Column style={tableCell}>{item.name}</Column>
              <Column style={tableCellRight}>{item.quantity}</Column>
              <Column style={tableCellRight}>{item.price}</Column>
            </Row>
          ))}
          <Hr style={totalDivider} />
          <Row style={totalRow}>
            <Column style={tableCell}>
              <strong>Total</strong>
            </Column>
            <Column style={tableCellRight}>
              <strong style={totalAmount}>{total}</strong>
            </Column>
          </Row>
        </Section>

        <Section style={ctaSection}>
          <EmailButton href={publicLink}>
            Accept & Pay Online
          </EmailButton>
        </Section>

        {pdfUrl && (
          <Text style={pdfLink}>
            Or <a href={pdfUrl} style={link}>download the PDF version</a>
          </Text>
        )}

        <Text style={helpText}>
          Questions? Reply to this email or call us anytime. We’re here to help!
        </Text>
      </Section>

      <EmailFooter companyName={companyName} />
    </EmailLayout>
  )
}

const content = {
  backgroundColor: '#ffffff',
  padding: '40px 30px',
  borderRadius: '0 0 8px 8px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
}

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px 0',
}

const quoteBox = {
  backgroundColor: '#eff6ff',
  border: '2px solid #3b82f6',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
}

const quoteLabel = {
  color: '#1e40af',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const validText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const tableSection = {
  margin: '0 0 32px 0',
}

const tableHeader = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px 6px 0 0',
}

const tableHeaderCell = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '12px 16px',
}

const tableHeaderCellRight = {
  ...tableHeaderCell,
  textAlign: 'right' as const,
}

const tableRow = {
  borderBottom: '1px solid #e5e7eb',
}

const tableCell = {
  color: '#1f2937',
  fontSize: '14px',
  padding: '12px 16px',
}

const tableCellRight = {
  ...tableCell,
  textAlign: 'right' as const,
}

const totalDivider = {
  borderColor: '#3b82f6',
  borderWidth: '2px',
  margin: '0',
}

const totalRow = {
  backgroundColor: '#f9fafb',
}

const totalAmount = {
  color: '#3b82f6',
  fontSize: '20px',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const pdfLink = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: '500',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '32px 0 0 0',
  fontStyle: 'italic',
}

export default QuoteSentEmail
