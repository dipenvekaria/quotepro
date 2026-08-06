import { Resend } from 'resend'

// Best-effort email: don't throw at import so the app builds and runs without
// RESEND_API_KEY configured (emails are simply skipped). Callers guard on null.
const apiKey = process.env.RESEND_API_KEY?.trim()

export const resend = apiKey ? new Resend(apiKey) : null
