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

    // Log to activity_log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert({
      company_id: quote.company_id,
      user_id: user?.id || null,
      entity_type: 'quote',
      entity_id: id,
      action: 'paid',
      description: 'Payment received',
      changes: { paid_at, payment_method },
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
