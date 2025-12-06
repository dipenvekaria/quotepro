import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF } from '@/components/QuotePDF'
import React from 'react'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export async function POST(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 16
    const params = await segmentData.params
    const quoteId = params.id

    // Fetch quote with all details
    const { data: quote, error: quoteError } = await supabase
      .from('work_items')
      .select(`
        *,
        quote_items (*),
        customer:customers(*),
        customer_addresses!customer_addresses_customer_id_fkey(*)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // @ts-ignore - Supabase typing
    const customer = quote.customer
    // @ts-ignore - Supabase typing
    const primaryAddress = quote.customer_addresses?.find((a: any) => a.is_primary) || quote.customer_addresses?.[0]

    // Fetch company details
    // @ts-ignore - Supabase typing issue
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      // @ts-ignore
      .eq('id', quote.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Prepare sign URL (you can customize this based on your routing)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'
    // @ts-ignore
    const signUrl = `${baseUrl}/q/${quote.id}`

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      // @ts-ignore - React element typing
      React.createElement(QuotePDF, {
        quote: {
          // @ts-ignore
          id: quote.id,
          // @ts-ignore
          quote_number: quote.quote_number,
          customer_name: customer?.name || 'Customer',
          customer_email: customer?.email || '',
          customer_phone: customer?.phone || '',
          customer_address: primaryAddress?.address || '',
          // @ts-ignore
          description: quote.description,
          // @ts-ignore
          subtotal: quote.subtotal,
          // @ts-ignore
          tax_rate: quote.tax_rate || 0,
          // @ts-ignore
          tax_amount: quote.tax_amount || 0,
          // @ts-ignore
          total: quote.total,
          // @ts-ignore
          notes: quote.notes,
          // @ts-ignore
          created_at: quote.created_at,
          // @ts-ignore
          photos: quote.photos || [],
        },
        company: {
          // @ts-ignore
          name: company.name || 'Your Company',
          // @ts-ignore
          logo_url: company.logo_url,
          // @ts-ignore
          license: company.license_number,
          // @ts-ignore
          phone: company.phone,
          // @ts-ignore
          email: company.email,
          // @ts-ignore
          website: company.website,
          // @ts-ignore
          address: company.address,
        },
        // @ts-ignore
        items: quote.quote_items.map((item: any) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          option_tier: item.option_tier,
          is_upsell: item.is_upsell,
          is_discount: item.is_discount || item.unit_price < 0,
        })),
        signUrl,
      })
    )

    // DEVELOPMENT MODE: Save to local filesystem for testing
    // This bypasses Supabase Storage entirely
    try {
      // Create output directory if it doesn't exist
      const outputDir = join(process.cwd(), 'generated-pdfs')
      mkdirSync(outputDir, { recursive: true })
      
      // Save PDF with quote ID in filename
      // @ts-ignore
      const localFileName = `quote-${quote.quote_number || quote.id}.pdf`
      const localFilePath = join(outputDir, localFileName)
      writeFileSync(localFilePath, pdfBuffer)
      
      console.log(`✅ PDF saved locally: ${localFilePath}`)
      
      // Return local file path for development
      return NextResponse.json({
        success: true,
        pdf_path: localFilePath,
        pdf_filename: localFileName,
        message: `PDF saved locally to: generated-pdfs/${localFileName}`,
        // @ts-ignore
        quote_id: quote.id,
        // @ts-ignore
        quote_number: quote.quote_number,
      })
    } catch (fsError) {
      console.error('File system error:', fsError)
      return NextResponse.json({ 
        error: 'Failed to save PDF locally', 
        details: fsError instanceof Error ? fsError.message : 'Unknown error' 
      }, { status: 500 })
    }

    // PRODUCTION MODE (commented out for now - uncomment when ready to deploy)
    /*
    // Upload to Supabase Storage
    // @ts-ignore
    const fileName = `quotes/${quote.id}/quote.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quotes')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('quotes')
      .getPublicUrl(fileName)

    // Update quote with PDF URL
    // @ts-ignore - Supabase typing
    const { error: updateError } = await supabase
      .from('quotes')
      // @ts-ignore
      .update({ pdf_url: publicUrl })
      // @ts-ignore
      .eq('id', quote.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pdf_url: publicUrl,
      message: 'PDF generated successfully',
    })
    */
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
