// @ts-nocheck - Supabase types pending generation
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

    // Log to activity_log
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert({
      company_id: quote.company_id,
      user_id: user?.id || null,
      entity_type: 'quote',
      entity_id: id,
      action: 'scheduled',
      description: 'Job scheduled',
      changes: { scheduled_at },
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
