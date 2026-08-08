import * as React from 'react'
import { Button } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function EmailButton({ href, children, variant = 'primary' }: EmailButtonProps) {
  const buttonStyle = variant === 'primary' ? primaryButton : secondaryButton
  
  return (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  )
}

const baseButton = {
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  borderRadius: '8px',
  minHeight: '44px',
  lineHeight: '1.5',
}

const primaryButton = {
  ...baseButton,
  backgroundColor: '#3b82f6',
  color: '#ffffff',
}

const secondaryButton = {
  ...baseButton,
  backgroundColor: '#ffffff',
  color: '#3b82f6',
  border: '2px solid #3b82f6',
}
