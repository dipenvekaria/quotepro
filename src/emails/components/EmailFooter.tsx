import * as React from 'react'
import { Section, Text, Link, Hr } from '@react-email/components'

export function EmailFooter() {
  const currentYear = new Date().getFullYear()
  
  return (
    <Section style={footer}>
      <Hr style={divider} />
      <Text style={footerText}>
        <strong>Field Genie</strong>
        <br />
        Professional Field Service Management
        <br />
        <Link href="mailto:hello@fieldgenie.app" style={link}>
          hello@fieldgenie.app
        </Link>
      </Text>
      <Text style={footerSmall}>
        © {currentYear} Field Genie. All rights reserved.
      </Text>
      <Text style={footerSmall}>
        Sent with ❤️ by Field Genie
      </Text>
    </Section>
  )
}

const footer = {
  marginTop: '32px',
  padding: '20px',
  textAlign: 'center' as const,
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0 0 0',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
}
