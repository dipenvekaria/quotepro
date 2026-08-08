import * as React from 'react'
import { Section, Img, Heading } from '@react-email/components'

export function EmailHeader() {
  return (
    <Section style={header}>
      <Heading style={headerText}>Field Genie</Heading>
      <p style={tagline}>Professional Field Service Management</p>
    </Section>
  )
}

const header = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const headerText = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const tagline = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '8px 0 0 0',
  opacity: 0.9,
}
