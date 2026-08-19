import * as React from 'react'
import { Section, Img, Heading } from '@react-email/components'

/**
 * The contractor's brand, never the platform's. Trust on a quote email comes
 * from the business the customer met — a platform banner reads as spam. The
 * old version shipped a blue "Field Genie" gradient (a brand that predates
 * Rivet) on every customer email.
 */
export function EmailHeader({
  companyName,
  logoUrl,
}: {
  companyName?: string
  logoUrl?: string | null
}) {
  return (
    <Section style={header}>
      {logoUrl ? (
        <Img src={logoUrl} alt={companyName ?? 'Logo'} height="44" style={logo} />
      ) : (
        <Heading style={headerText}>{companyName ?? ''}</Heading>
      )}
    </Section>
  )
}

const header = {
  padding: '28px 24px 8px',
}

const logo = {
  height: '44px',
  maxWidth: '200px',
  objectFit: 'contain' as const,
}

const headerText = {
  color: '#111111',
  fontSize: '22px',
  fontWeight: 600,
  margin: 0,
  padding: 0,
}
