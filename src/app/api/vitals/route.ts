import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Vitals API endpoint
 * Receives Core Web Vitals metrics from the client
 */
export async function POST(request: NextRequest) {
  try {
    const metric = await request.json()

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals API]', metric)
    }

    // In production, you could:
    // 1. Store in Supabase for analysis
    // 2. Send to PostHog/Analytics
    // 3. Send to monitoring service

    // For now, just acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error processing web vitals:', error)
    return NextResponse.json({ error: 'Failed to process vitals' }, { status: 500 })
  }
}
