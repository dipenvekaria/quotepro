// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { completed_at } = await request.json()

    if (!completed_at) {
      return NextResponse.json(
        { error: 'completed_at is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the quote with completed_at timestamp
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        completed_at: new Date(completed_at).toISOString(),
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

    // Log to audit trail
    await supabase.from('audit_trail').insert({
      quote_id: id,
      action: 'completed',
      user_id: null, // System action
      details: {
        completed_at: completed_at,
        timestamp: new Date().toISOString(),
      },
    })

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
