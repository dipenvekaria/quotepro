import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY not found')
}

export const resend = new Resend(process.env.RESEND_API_KEY)
