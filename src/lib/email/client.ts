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

/**
 * The From header on everything we send.
 *
 * `onboarding@resend.dev` is Resend's sandbox sender: it only delivers to the
 * account's own verified address, so leaving it in place means every customer
 * email is accepted by the API and never arrives. Set RESEND_FROM_EMAIL to an
 * address on a domain verified in Resend before sending to anyone real.
 */
export function getFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  // Was 'QuotePro' — the pre-rename product name, which would have gone out on
  // the From line of every quote and invoice. See docs/adr/0004.
  const name = process.env.RESEND_FROM_NAME || 'Rivet'
  return `${name} <${email}>`
}
