// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { paid_at, payment_method } = await request.json()

    if (!paid_at) {
      return NextResponse.json(
        { error: 'paid_at is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the quote with paid_at timestamp and payment method
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        paid_at: new Date(paid_at).toISOString(),
        payment_method: payment_method || 'manual',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error marking quote as paid:', error)
      return NextResponse.json(
        { error: 'Failed to mark quote as paid' },
        { status: 500 }
      )
    }

    // Log to audit trail
    await supabase.from('audit_trail').insert({
      quote_id: id,
      action_type: 'quote_paid',
      field_name: 'paid_at',
      new_value: paid_at,
      changed_by: null,
      changed_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      quote,
    })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
