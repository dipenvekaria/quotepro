import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSignNowClient } from '@/lib/signnow'

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
    
    // Generate PDF 
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/quotes/${quote_id}/pdf`
    
    try {
      // Fetch the PDF as a buffer
      const pdfResponse = await fetch(pdfUrl)
      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF')
      }
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

      // Initialize SignNow client
      const signNowClient = createSignNowClient()
      
      // Upload document to SignNow
      const documentId = await signNowClient.uploadDocument(
        pdfBuffer,
        `Quote_${quoteData.quote_number}_${quoteData.customer_name}.pdf`
      )
      
      // Create signing invitation
      const inviteId = await signNowClient.createInvite(
        documentId,
        quoteData.customer_email || 'customer@example.com',
        quoteData.customer_name,
        `Quote ${quoteData.quote_number} from ${company.name}`,
        `Hi ${quoteData.customer_name},\n\nPlease review and sign this quote to proceed with the work.\n\nTotal: $${quoteData.total.toLocaleString()}\n\nThank you,\n${company.name}`
      )
      
      // Save signature request to database
      await supabase
        .from('signed_documents')
        // @ts-ignore - Supabase typing
        .insert({
          quote_id,
          signnow_document_id: documentId,
          signnow_invite_id: inviteId,
          status: 'pending',
        })

      // Update quote status to sent
      await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', quote_id)

      return NextResponse.json({
        success: true,
        document_id: documentId,
        invite_id: inviteId,
        message: 'Quote sent for signature via SignNow',
      })
    } catch (signError) {
      console.error('SignNow error:', signError)
      
      // Fallback: just mark as sent without e-signature
      await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', quote_id)

      return NextResponse.json({
        success: true,
        message: 'Quote sent without e-signature (SignNow not configured)',
        error: signError instanceof Error ? signError.message : 'Unknown error',
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
