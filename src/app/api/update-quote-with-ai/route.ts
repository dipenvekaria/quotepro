import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { quote_id, user_prompt, company_id } = body

    if (!quote_id || !user_prompt || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch existing quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('id', quote_id)
      .single() as { data: any; error: any }

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Call Python backend to update quote
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/update-quote-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id,
        company_id,
        user_prompt,
        existing_items: quote.quote_items,
        customer_name: quote.customer_name,
        customer_address: quote.customer_address,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Python backend error:', error)
      return NextResponse.json(
        { error: error.detail || 'Failed to update quote' },
        { status: response.status }
      )
    }

    const updatedQuote = await response.json()

    // Log audit trail
    const { error: auditError } = await supabase.from('quote_audit_log').insert({
      quote_id,
      action_type: 'ai_update',
      user_prompt,
      description: `User requested: "${user_prompt}"`,
      changes_made: {
        added_items: updatedQuote.added_items || [],
        modified_items: updatedQuote.modified_items || [],
        removed_items: updatedQuote.removed_items || [],
      },
      created_by: user.id,
    } as any)

    if (auditError) {
      console.error('Failed to log audit trail:', auditError)
    }
    
    return NextResponse.json(updatedQuote)
    
  } catch (error) {
    console.error('Quote update error:', error)
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}
