import * as React from 'react'
import { Html, Head, Body, Container, Section, Text, Button, Hr } from '@react-email/components'

interface InvoiceReadyEmailProps {
  customerName: string
  invoiceNumber: string
  total: string
  dueDate: string
  paymentLink: string
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}

export const InvoiceReadyEmail = ({
  customerName = 'John Doe',
  invoiceNumber = 'INV-001',
  total = '$850.00',
  dueDate = 'January 15, 2025',
  paymentLink = 'https://fieldgenie.app/pay/123',
  items = [
    { name: 'Faucet Installation', quantity: 1, price: '$350.00' },
    { name: 'Materials', quantity: 1, price: '$500.00' },
  ],
}: InvoiceReadyEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Text style={headerTitle}>Field Genie</Text>
          <Text style={headerSubtitle}>Professional Service Invoice</Text>
        </Section>

        {/* Greeting */}
        <Section style={content}>
          <Text style={greeting}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Thank you for choosing Field Genie! Your work has been completed and your invoice is ready.
          </Text>

          {/* Invoice Details */}
          <Section style={invoiceBox}>
            <Text style={invoiceLabel}>Invoice Number</Text>
            <Text style={invoiceValue}>{invoiceNumber}</Text>
            
            <Text style={invoiceLabel}>Due Date</Text>
            <Text style={invoiceValue}>{dueDate}</Text>
            
            <Text style={invoiceLabel}>Total Amount</Text>
            <Text style={totalAmount}>{total}</Text>
          </Section>

          {/* Items Table */}
          <Section style={tableSection}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={tableHeader}>
                  <th style={tableHeaderCell}>Description</th>
                  <th style={tableHeaderCellRight}>Qty</th>
                  <th style={tableHeaderCellRight}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} style={tableRow}>
                    <td style={tableCell}>{item.name}</td>
                    <td style={tableCellRight}>{item.quantity}</td>
                    <td style={tableCellRight}>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Payment CTA */}
          <Section style={ctaSection}>
            <Button href={paymentLink} style={button}>
              Pay Invoice Online
            </Button>
          </Section>

          <Text style={paragraph}>
            We accept all major credit cards, debit cards, and ACH payments.
          </Text>

          <Hr style={hr} />

          <Text style={helpText}>
            Questions about your invoice? Reply to this email or call us at (555) 123-4567.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Field Genie © {new Date().getFullYear()}
          </Text>
          <Text style={footerText}>
            Professional Field Service Management
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// Styles
const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#1e40af',
  backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  padding: '32px 24px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const headerSubtitle = {
  color: '#dbeafe',
  fontSize: '16px',
  margin: '0',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 24px',
  borderRadius: '0 0 12px 12px',
}

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const invoiceBox = {
  backgroundColor: '#f9fafb',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const invoiceLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px 0',
}

const invoiceValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const totalAmount = {
  color: '#3b82f6',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const tableSection = {
  margin: '24px 0',
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
  textAlign: 'left' as const,
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

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}

const hr = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
  fontStyle: 'italic',
}

const footer = {
  textAlign: 'center' as const,
  padding: '24px 0',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '4px 0',
}

export default InvoiceReadyEmail
