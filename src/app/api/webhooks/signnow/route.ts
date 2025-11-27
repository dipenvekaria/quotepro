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

    // Find the quote associated with this document
    const { data: signedDoc, error: findError } = await supabase
      .from('signed_documents')
      .select('*, quotes(*)')
      .eq('signnow_document_id', event.data.document_id)
      .single() as { data: any; error: any }

    if (findError || !signedDoc) {
      console.error('Document not found in database:', event.data.document_id)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Handle different event types
    switch (event.event) {
      case 'document.signed':
        // Update signed_documents table
        await supabase
          .from('signed_documents')
          .update({
            status: 'signed',
            signed_at: event.data.signed_at || new Date().toISOString(),
          })
          .eq('id', signedDoc.id)

        // Update quote status
        await supabase
          .from('quotes')
          .update({
            status: 'signed',
            signed_at: event.data.signed_at || new Date().toISOString(),
          } as any)
          .eq('id', signedDoc.quote_id)

        console.log('✅ Quote marked as signed:', signedDoc.quotes.quote_number)

        // Optional: Send notification to sales team
        // await sendNotification({
        //   type: 'quote_signed',
        //   quote_number: signedDoc.quotes.quote_number,
        //   customer: signedDoc.quotes.customer_name,
        // })

        break

      case 'document.declined':
        // Update signed_documents table
        await supabase
          .from('signed_documents')
          .update({
            status: 'declined',
          })
          .eq('id', signedDoc.id)

        // Update quote status
        await supabase
          .from('quotes')
          .update({
            status: 'rejected',
          } as any)
          .eq('id', signedDoc.quote_id)

        console.log('❌ Quote declined:', signedDoc.quotes.quote_number)

        // Optional: Send notification to sales team
        // await sendNotification({
        //   type: 'quote_declined',
        //   quote_number: signedDoc.quotes.quote_number,
        //   customer: signedDoc.quotes.customer_name,
        //   reason: event.data.reason,
        // })

        break

      case 'document.viewed':
        // Optional: Track when customer viewed the document
        console.log('👀 Quote viewed:', signedDoc.quotes.quote_number)
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
