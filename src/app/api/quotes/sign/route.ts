import { NextRequest, NextResponse } from 'next/server'
import { sbAdmin } from '@/lib/supabase/untyped'
import { createSignNowClient } from '@/lib/signnow'
import { checkRateLimit, LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // The token is the authorization here, exactly as it is for /q. The route
    // previously took `quote_id` and matched `id`, while the only caller passed
    // a public_token — so every lookup matched zero rows and the whole signing
    // flow, plus its fallback, silently did nothing.
    const { token } = await request.json()

    if (typeof token !== 'string' || token.length < 20 || token.length > 64) {
      return NextResponse.json({ error: 'Missing or invalid token' }, { status: 400 })
    }

    // Unauthenticated by design — the token is the credential — so without this
    // anyone holding a quote link could call it as fast as they liked. Bucketed
    // per token so one customer's retries cannot lock out anybody else's quote.
    const rl = await checkRateLimit(`sign:${token}`, LIMITS.sign.limit, LIMITS.sign.windowSeconds)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.resetIn) } },
      )
    }

    // Service role: the caller is an anonymous customer holding a token, and
    // `authenticated` policies do not apply to them. The token is the check.
    const supabase = sbAdmin()

    const { data: quote, error: quoteError } = await supabase
      .from('work_items')
      .select(`
        *,
        companies(*),
        customer:customers(*)
      `)
      .eq('public_token', token)
      .maybeSingle()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // The Supabase client's generated types predate the current schema, so the
    // embedded relations come back loosely typed. Narrow to the fields this
    // route actually reads rather than suppressing the whole block.
    const quote_ = quote as unknown as {
      quote_number: string | null
      total: number | null
      companies?: { name?: string | null } | null
      customer?: { name?: string | null; email?: string | null } | null
    }
    const company = quote_.companies
    const customer = quote_.customer
    const quoteData = quote_
    const quoteId = (quote as unknown as { id: string }).id
    
    // Generate PDF 
    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/q/${token}/pdf`
    
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
        `Quote_${quoteData.quote_number}_${customer?.name || 'Customer'}.pdf`
      )
      
      // Create signing invitation
      const inviteId = await signNowClient.createInvite(
        documentId,
        customer?.email || 'customer@example.com',
        customer?.name || 'Customer',
        `Quote ${quoteData.quote_number ?? ''} from ${company?.name ?? 'your contractor'}`,
        `Hi ${customer?.name || 'Customer'},\n\nPlease review and sign this quote to proceed with the work.\n\nTotal: $${(quoteData.total ?? 0).toLocaleString()}\n\nThank you,\n${company?.name ?? 'your contractor'}`
      )
      
      // Save signature request to database
      await supabase
        .from('signed_documents')
        .insert({
          quote_id: quoteId,
          signnow_document_id: documentId,
          signnow_invite_id: inviteId,
          status: 'pending',
        })

      // Update quote status to sent
      await supabase
        .from('work_items')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', (quote as unknown as { id: string }).id)

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
        .from('work_items')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', (quote as unknown as { id: string }).id)

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
