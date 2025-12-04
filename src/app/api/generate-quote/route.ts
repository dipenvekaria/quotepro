import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, description, customer_name, customer_address, existing_items } = body

    if (!company_id || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Proxy request to Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id,
        description,
        customer_name: customer_name || 'Customer',
        customer_address: customer_address || '',
        existing_items: existing_items || [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Python backend error:', error)
      return NextResponse.json(
        { error: error.detail || 'Failed to generate quote' },
        { status: response.status }
      )
    }

    const quoteData = await response.json()
    return NextResponse.json(quoteData)
    
  } catch (error) {
    console.error('Quote generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    )
  }
}
