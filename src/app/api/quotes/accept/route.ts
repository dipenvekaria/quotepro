// @ts-nocheck - Supabase types pending regeneration
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/quotes/accept
 * 
 * Instantly accepts a quote without requiring signature.
 * This is the fallback when SignNow fails or is not configured.
 */
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

    // Get the quote
    const { data: quote, error: quoteError } = await supabase
      .from('work_items')
      .select('*')
      .eq('id', quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Update quote status to 'accepted'
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('work_items')
      .update({
        status: 'accepted',
        accepted_at: now,
        // Also set sent_at if not already set
        sent_at: quote.sent_at || now,
      })
      .eq('id', quote_id)

    if (updateError) {
      console.error('Failed to update quote:', updateError)
      return NextResponse.json(
        { error: 'Failed to accept quote' },
        { status: 500 }
      )
    }

    // Log to activity_log (new schema)
    try {
      await supabase
        .from('activity_log')
        .insert({
          company_id: quote.company_id,
          entity_type: 'quote',
          entity_id: quote_id,
          action: 'accepted',
          description: 'Customer accepted quote',
          changes: {
            status: { from: quote.status, to: 'accepted' },
            accepted_at: now,
          },
          metadata: {
            method: 'instant_acceptance',
          }
        })
    } catch (auditError) {
      console.warn('Failed to log activity:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Quote accepted successfully',
      quote_id,
      status: 'accepted',
      accepted_at: now,
    })
  } catch (error) {
    console.error('Accept quote error:', error)
    return NextResponse.json(
      { error: 'Failed to accept quote' },
      { status: 500 }
    )
  }
}
