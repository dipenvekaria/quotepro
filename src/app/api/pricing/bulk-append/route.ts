import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Forward to Python backend
    const response = await fetch('http://localhost:8000/api/pricing/bulk-append', {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Append failed' },
        { status: response.status }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Bulk append proxy error:', error)
    return NextResponse.json(
      { detail: error.message || 'Append failed' },
      { status: 500 }
    )
  }
}
