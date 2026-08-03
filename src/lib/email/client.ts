/**
 * Lazy Resend client — returns `null` if RESEND_API_KEY isn't set so callers
 * can degrade gracefully instead of crashing at import time.
 */

import { Resend } from 'resend'

let _resend: Resend | null | undefined

export function getResend(): Resend | null {
  if (_resend !== undefined) return _resend
  const key = process.env.RESEND_API_KEY?.trim()
  _resend = key ? new Resend(key) : null
  return _resend
}

export function getFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const name = process.env.RESEND_FROM_NAME || 'QuotePro'
  return `${name} <${email}>`
}
