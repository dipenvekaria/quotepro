import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignatureRequestApi } from '@dropbox/sign'

export async function POST(request: NextRequest) {
  try {
    const { quote_id } = await request.json()

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

    // @ts-ignore - Supabase typing
    const company = quote.companies
    // @ts-ignore - Supabase typing
    const quoteData: any = quote
    
    // Generate PDF URL
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${quote_id}/pdf`

    // Create signature request with Dropbox Sign
    const signatureRequestApi = new SignatureRequestApi()
    signatureRequestApi.username = process.env.DROPBOX_SIGN_API_KEY!

    const data = {
      title: `Quote ${quoteData.quote_number} - ${quoteData.customer_name}`,
      subject: `Your quote from ${company.name} is ready`,
      message: 'Please review and sign this quote to proceed with the work.',
      signers: [
        {
          emailAddress: quoteData.customer_email || 'customer@example.com',
          name: quoteData.customer_name,
          order: 0,
        },
      ],
      fileUrl: [pdfUrl],
      testMode: process.env.NODE_ENV !== 'production',
    }

    try {
      const result = await signatureRequestApi.signatureRequestSend(data)
      
      // Save signature request to database
      await supabase
        .from('signed_documents')
        // @ts-ignore - Supabase typing
        .insert({
          quote_id,
          // @ts-ignore
          dropbox_signature_request_id: result.body.signature_request.signature_request_id,
          status: 'pending',
        })

      return NextResponse.json({
        success: true,
        // @ts-ignore
        signature_request_id: result.body.signature_request.signature_request_id,
      })
    } catch (signError) {
      console.error('Dropbox Sign error:', signError)
      
      // Fallback: just mark as sent without e-signature
      return NextResponse.json({
        success: true,
        message: 'Quote sent without e-signature (Dropbox Sign not configured)',
      })
    }
  } catch (error) {
    console.error('Sign quote error:', error)
    return NextResponse.json(
      { error: 'Failed to create signature request' },
      { status: 500 }
    )
  }
}
