import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * SignNow Webhook Handler
 * 
 * Receives notifications when documents are signed, declined, etc.
 * 
 * Setup in SignNow Dashboard:
 * 1. Go to API Settings → Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/signnow
 * 3. Select events: document.signed, document.declined
 */

interface SignNowWebhookEvent {
  event: string // 'document.signed', 'document.declined', etc.
  data: {
    document_id: string
    user_id: string
    signer_email: string
    signed_at?: string
    declined_at?: string
    reason?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const event: SignNowWebhookEvent = await request.json()
    
    console.log('📨 SignNow webhook received:', event.event, event.data.document_id)

    const supabase = await createClient()

    // Find the quote associated with this SignNow document
    const { data: quotes, error: findError } = await supabase
      .from('quotes')
      .select('*')
      .eq('signnow_document_id', event.data.document_id)
      .limit(1)

    if (findError || !quotes || quotes.length === 0) {
      console.error('Quote not found for SignNow document:', event.data.document_id)
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    const quote = quotes[0]

    // Handle different event types
    switch (event.event) {
      case 'document.signed':
        // Update quote with signed status and timestamp
        // @ts-ignore
        await supabase
          .from('quotes')
          // @ts-ignore
          .update({
            status: 'signed',
            signed_at: event.data.signed_at || new Date().toISOString(),
          })
          // @ts-ignore
          .eq('id', quote.id)

        // Log to audit trail
        // @ts-ignore
        await supabase.from('quote_audit_log').insert({
          // @ts-ignore
          quote_id: quote.id,
          action: 'signed',
          user_id: null, // Customer action
          details: {
            signer_email: event.data.signer_email,
            signed_at: event.data.signed_at || new Date().toISOString(),
            signnow_document_id: event.data.document_id,
          },
        })

        // @ts-ignore
        console.log('✅ Quote marked as signed:', quote.quote_number)

        // TODO: Send notification to sales team
        // await sendNotification({
        //   type: 'quote_signed',
        //   quote_number: quote.quote_number,
        //   customer: quote.customer_name,
        // })

        break

      case 'document.declined':
        // Update quote status to declined
        // @ts-ignore
        await supabase
          .from('quotes')
          // @ts-ignore
          .update({
            status: 'declined',
          })
          // @ts-ignore
          .eq('id', quote.id)

        // Log to audit trail
        // @ts-ignore
        await supabase.from('quote_audit_log').insert({
          // @ts-ignore
          quote_id: quote.id,
          action: 'declined',
          user_id: null,
          details: {
            decliner_email: event.data.signer_email,
            declined_at: event.data.declined_at || new Date().toISOString(),
            reason: event.data.reason || 'No reason provided',
          },
        })

        // @ts-ignore
        console.log('❌ Quote declined:', quote.quote_number)

        // TODO: Send notification to sales team
        // await sendNotification({
        //   type: 'quote_declined',
        //   quote_number: quote.quote_number,
        //   customer: quote.customer_name,
        //   reason: event.data.reason,
        // })

        break

      case 'document.viewed':
        // Track when customer viewed the document in SignNow
        // @ts-ignore
        await supabase.from('quote_audit_log').insert({
          // @ts-ignore
          quote_id: quote.id,
          action: 'viewed_signnow',
          user_id: null,
          details: {
            viewer_email: event.data.signer_email,
            viewed_at: new Date().toISOString(),
          },
        })
        
        // @ts-ignore
        console.log('👀 Quote viewed in SignNow:', quote.quote_number)
        break

      default:
        console.log('⚠️  Unhandled event type:', event.event)
    }

    return NextResponse.json({ success: true, event: event.event })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Verify webhook signature (optional but recommended for production)
 */
function verifySignNowSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // SignNow uses HMAC-SHA256 for webhook signatures
  // Implement signature verification here
  // See: https://docs.signnow.com/docs/signnow/webhooks
  
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === expectedSignature
}
