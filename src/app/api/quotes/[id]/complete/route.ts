// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { completed_at, customer_signature } = await request.json()

    if (!completed_at) {
      return NextResponse.json(
        { error: 'completed_at is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the work_item with completed_at timestamp and signature
    const { data: quote, error } = await supabase
      .from('work_items')
      .update({
        completed_at: new Date(completed_at).toISOString(),
        customer_signature: customer_signature || null,
        status: 'completed',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error completing quote:', error)
      return NextResponse.json(
        { error: 'Failed to complete quote' },
        { status: 500 }
      )
    }

    // Log to activity_log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert({
      company_id: quote.company_id,
      user_id: user?.id || null,
      entity_type: 'work_item',
      entity_id: id,
      action: 'completed',
      description: 'Job marked as completed',
      changes: { completed_at },
    })

    // Automatically send invoice after job completion
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const sendInvoiceUrl = `${baseUrl}/api/quotes/${id}/send-invoice`
      
      const invoiceResponse = await fetch(sendInvoiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json()
        console.log('✅ Invoice sent automatically:', invoiceData.invoice_number)
      } else {
        console.error('⚠️ Failed to send invoice automatically')
      }
    } catch (invoiceError) {
      // Don't fail the completion if invoice sending fails
      console.error('Error sending invoice:', invoiceError)
    }

    return NextResponse.json({
      success: true,
      quote,
    })
  } catch (error) {
    console.error('Complete quote error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
