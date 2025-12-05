import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, customer_name, company_id } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Proxy request to Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/generate-job-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        customer_name,
        company_id,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Python backend error:', error)
      return NextResponse.json(
        { error: error.detail || 'Failed to generate job name' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Job name generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate job name' },
      { status: 500 }
    )
  }
}
