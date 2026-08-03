import { resend } from './resend-client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || 'Field Genie <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo,
      attachments: options.attachments,
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Email sent:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('❌ Email send failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
