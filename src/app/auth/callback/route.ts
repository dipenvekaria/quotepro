import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  
  // Get the actual origin from headers (for ngrok/tunnels) or fall back to request URL
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const origin = forwardedHost 
    ? `${forwardedProto || 'https'}://${forwardedHost}`
    : requestUrl.origin
  
  console.log('🔐 OAuth Callback:')
  console.log('  - Forwarded Host:', forwardedHost)
  console.log('  - Origin:', origin)
  console.log('  - Full URL:', requestUrl.toString())

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        console.log('  - User authenticated:', user.email)
        
        // NEW SCHEMA: Check users table for company_id
        const { data: userRecord } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single() as { data: { company_id: string } | null }

        // If no user record exists, redirect to onboarding
        const redirectTo = userRecord?.company_id ? (next || '/dashboard') : '/onboarding'
        
        // Create redirect URL preserving the original host
        const redirectUrl = new URL(redirectTo, origin)
        
        console.log('  - Redirecting to:', redirectUrl.toString())
        
        return NextResponse.redirect(redirectUrl.toString())
      }
    } else {
      console.log('  - Auth error:', error.message)
    }
  }

  // Return the user to login with error, preserving host
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'Unable to authenticate')
  console.log('  - Failed, redirecting to:', loginUrl.toString())
  return NextResponse.redirect(loginUrl.toString())
}
