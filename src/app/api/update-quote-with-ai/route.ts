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

    // Fetch existing quote with customer data (new normalized schema)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items(*)
      `)
      .eq('id', quote_id)
      .single() as { data: any; error: any }

    if (quoteError || !quote) {
      console.error('Quote fetch error:', quoteError)
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Fetch customer data separately if customer_id exists
    let customerName = 'Customer'
    let customerAddress = ''
    
    if (quote.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name, email, phone')
        .eq('id', quote.customer_id)
        .single()
      
      if (customer) {
        customerName = customer.name || 'Customer'
      }

      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('address')
        .eq('customer_id', quote.customer_id)
        .eq('is_primary', true)
        .limit(1)
      
      customerAddress = addresses?.[0]?.address || ''
    }

    // Load conversation history from activity_log (new schema)
    const { data: auditHistory } = await supabase
      .from('activity_log')
      .select('description, changes, metadata, action, created_at')
      .eq('entity_id', quote_id)
      .eq('entity_type', 'quote')
      .in('action', ['ai_generated', 'ai_updated'])
      .order('created_at', { ascending: true })

    // Call Python backend to update quote with conversation history
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/update-quote-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quote_id,
        company_id,
        user_prompt,
        existing_items: quote.quote_items || [],
        customer_name: customerName,
        customer_address: customerAddress,
        conversation_history: auditHistory || [],
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

    // Calculate what changed for audit trail display
    const previousItems = quote.quote_items || []
    const newItems = updatedQuote.line_items || []
    const previousTotal = previousItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    const newTotal = updatedQuote.total || 0
    
    // Find added and removed items by description
    const previousDescriptions = new Set(previousItems.map((i: any) => i.description))
    const newDescriptions = new Set(newItems.map((i: any) => i.description))
    const itemsAdded = newItems.filter((i: any) => !previousDescriptions.has(i.description)).map((i: any) => i.description)
    const itemsRemoved = previousItems.filter((i: any) => !newDescriptions.has(i.description)).map((i: any) => i.description)

    // Log to activity_log (new schema)
    const { error: auditError } = await supabase.from('activity_log').insert({
      company_id,
      user_id: user.id,
      entity_type: 'quote',
      entity_id: quote_id,
      action: 'ai_updated',
      description: `AI updated quote: "${user_prompt.substring(0, 100)}${user_prompt.length > 100 ? '...' : ''}"`,
      changes: {
        ai_prompt: user_prompt,
        items_added: itemsAdded,
        items_removed: itemsRemoved,
        previous_total: previousTotal,
        new_total: newTotal,
        previous_item_count: previousItems.length,
        new_item_count: newItems.length,
      },
      metadata: {
        line_items: newItems,
        subtotal: updatedQuote.subtotal || 0,
        total: newTotal,
      },
    })

    if (auditError) {
      console.error('Failed to log activity:', auditError)
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
