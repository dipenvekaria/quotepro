import * as React from 'react'
import { Section, Text, Hr } from '@react-email/components'

/** Quiet close: the business's name, a reply nudge, and a small Rivet credit. */
export function EmailFooter({ companyName }: { companyName?: string }) {
  const currentYear = new Date().getFullYear()

  return (
    <Section style={footer}>
      <Hr style={divider} />
      <Text style={footerText}>
        Questions? Just reply to this email.
      </Text>
      <Text style={footerSmall}>
        © {currentYear} {companyName ?? ''} · Sent with Rivet
      </Text>
    </Section>
  )
}

const footer = {
  marginTop: '28px',
  padding: '0 24px 24px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0 0 16px',
}

const footerText = {
  color: '#555555',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 6px',
}

const footerSmall = {
  color: '#999999',
  fontSize: '12px',
  margin: 0,
}
