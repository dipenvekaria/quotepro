import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Debug logging
    console.log('🔄 Bulk Upload Proxy - FormData entries:')
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }
    
    // Forward to Python backend
    const response = await fetch('http://localhost:8000/api/pricing/bulk-upload', {
      method: 'POST',
      body: formData,
    })
    
    console.log('📊 Python backend response status:', response.status)
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Backend error:', data)
      return NextResponse.json(
        { detail: data.detail || 'Upload failed' },
        { status: response.status }
      )
    }
    
    console.log('✅ Upload successful:', data.items_count, 'items')
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('❌ Bulk upload proxy error:', error)
    return NextResponse.json(
      { detail: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
