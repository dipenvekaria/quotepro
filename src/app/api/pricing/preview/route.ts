import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Forward to Python backend
    const response = await fetch('http://localhost:8000/api/pricing/preview', {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to preview file' },
        { status: response.status }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Preview proxy error:', error)
    return NextResponse.json(
      { detail: error.message || 'Failed to preview file' },
      { status: 500 }
    )
  }
}
