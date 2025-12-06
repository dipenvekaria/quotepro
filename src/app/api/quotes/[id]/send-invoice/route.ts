// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDF } from '@/components/InvoicePDF'
import { getNextInvoiceNumber } from '@/lib/invoice-number'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get quote with items and customer
    const { data: quote, error: quoteError } = await supabase
      .from('work_items')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    const customer = quote.customer

    // Ensure job is completed
    if (!quote.completed_at) {
      return NextResponse.json(
        { error: 'Cannot send invoice for incomplete job' },
        { status: 400 }
      )
    }

    // Generate invoice number if not exists
    let invoiceNumber = quote.invoice_number
    if (!invoiceNumber) {
      invoiceNumber = await getNextInvoiceNumber(supabase)
      
      // Update work_item with invoice number
      const { error: updateError } = await supabase
        .from('work_items')
        .update({ invoice_number: invoiceNumber })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating invoice number:', updateError)
        return NextResponse.json(
          { error: 'Failed to generate invoice number' },
          { status: 500 }
        )
      }
    }

    // Get quote items
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to fetch quote items' },
        { status: 500 }
      )
    }

    // Company info (hardcoded for now, move to settings later)
    const company = {
      name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Your Company',
      logo_url: process.env.NEXT_PUBLIC_COMPANY_LOGO,
      license: process.env.NEXT_PUBLIC_COMPANY_LICENSE,
      phone: process.env.NEXT_PUBLIC_COMPANY_PHONE,
      email: process.env.NEXT_PUBLIC_COMPANY_EMAIL,
      website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE,
      address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
    }

    // Generate Invoice PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        quote: {
          ...quote,
          invoice_number: invoiceNumber,
          customer_name: customer?.name || 'Customer',
          customer_email: customer?.email || '',
          customer_phone: customer?.phone || '',
          customer_address: '', // TODO: fetch from customer_addresses
        },
        company,
        items: items || [],
      })
    )

    // Upload PDF to Supabase Storage
    const fileName = `invoices/${id}/invoice-${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload invoice PDF' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('documents')
      .getPublicUrl(fileName)

    // Create demo payment link (will be Stripe later)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const paymentLinkUrl = `${baseUrl}/q/${id}/pay`

    // Update work_item with invoice details
    const { error: updateInvoiceError } = await supabase
      .from('work_items')
      .update({
        invoice_pdf_url: publicUrl,
        payment_link_url: paymentLinkUrl,
        invoice_sent_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateInvoiceError) {
      console.error('Error updating invoice details:', updateInvoiceError)
      return NextResponse.json(
        { error: 'Failed to save invoice details' },
        { status: 500 }
      )
    }

    // TODO: Send email via Resend
    // For now, just log that we would send an email
    console.log(`📧 Would send invoice email to: ${customer?.email || 'No email'}`)
    console.log(`   Invoice: ${invoiceNumber}`)
    console.log(`   PDF: ${publicUrl}`)
    console.log(`   Payment Link: ${paymentLinkUrl}`)

    // Log to activity log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert({
      company_id: quote.company_id,
      user_id: user?.id || null,
      entity_type: 'quote',
      entity_id: id,
      action: 'invoice_sent',
      description: `Invoice ${invoiceNumber} sent`,
      changes: { invoice_number: invoiceNumber },
    })

    return NextResponse.json({
      success: true,
      invoice_number: invoiceNumber,
      pdf_url: publicUrl,
      payment_link: paymentLinkUrl,
      email_sent: false, // Will be true when Resend is integrated
    })
  } catch (error) {
    console.error('Send invoice error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
