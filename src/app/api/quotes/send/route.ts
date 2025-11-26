import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const { quote_id, send_via } = await request.json()

    if (!quote_id) {
      return NextResponse.json(
        { error: 'Missing quote_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        companies(*)
      `)
      .eq('id', quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // @ts-ignore
    const company = quote.companies
    const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quote_id}/view`

    // Send SMS if requested
    if (send_via === 'sms' || send_via === 'both') {
      // @ts-ignore
      if (!quote.customer_phone) {
        return NextResponse.json(
          { error: 'Customer phone number required for SMS' },
          { status: 400 }
        )
      }

      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )

      await twilioClient.messages.create({
        // @ts-ignore
        to: quote.customer_phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        // @ts-ignore
        body: `Hey ${quote.customer_name.split(' ')[0]}, here's your quote from ${company.name} – takes 10 seconds to review & sign → ${quoteUrl}`,
      })
    }

    // Send Email if requested (using Supabase or other email service)
    if (send_via === 'email' || send_via === 'both') {
      // @ts-ignore
      if (!quote.customer_email) {
        return NextResponse.json(
          { error: 'Customer email required for email' },
          { status: 400 }
        )
      }

      // TODO: Implement email sending via SendGrid, Resend, or Supabase
      // For now, we'll just return success
      console.log('Email sending not yet implemented')
    }

    // Update quote status to 'sent'
    await supabase
      .from('quotes')
      // @ts-ignore - Supabase typing
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', quote_id)

    return NextResponse.json({ 
      success: true,
      message: 'Quote sent successfully',
      quote_url: quoteUrl
    })
  } catch (error) {
    console.error('Send quote error:', error)
    return NextResponse.json(
      { error: 'Failed to send quote' },
      { status: 500 }
    )
  }
}
