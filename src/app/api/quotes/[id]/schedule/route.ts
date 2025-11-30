import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { scheduled_at } = await request.json()

    if (!scheduled_at) {
      return NextResponse.json(
        { error: 'scheduled_at is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the quote with scheduled_at timestamp
    // @ts-ignore
    const { data: quote, error } = await supabase
      .from('quotes')
      .update({
        scheduled_at: new Date(scheduled_at).toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error scheduling quote:', error)
      return NextResponse.json(
        { error: 'Failed to schedule quote' },
        { status: 500 }
      )
    }

    // Log to audit trail
    await supabase.from('audit_trail').insert({
      quote_id: id,
      action_type: 'quote_scheduled',
      field_name: 'scheduled_at',
      new_value: scheduled_at,
      changed_by: null,
      changed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      quote,
    })
  } catch (error) {
    console.error('Schedule quote error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
