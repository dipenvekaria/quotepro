import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()

  // Allow public routes
  const publicRoutes = ['/login', '/auth', '/q/', '/i/', '/join', '/forgot-password', '/reset-password']
  const isPublicRoute =
    // The homepage is the marketing page for signed-out visitors; the page
    // itself sends signed-in users on to /app.
    request.nextUrl.pathname === '/' ||
    publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // An auth callback lands with ?code= (PKCE) or ?token_hash= (email OTP) and no
  // session yet — establishing the session is precisely what the code is for.
  // Redirecting to /login clones the URL, so the code survives on a page that
  // never exchanges it and the email link silently fails. Let these through to
  // whatever calls exchangeCodeForSession.
  const hasAuthCode =
    request.nextUrl.searchParams.has('code') || request.nextUrl.searchParams.has('token_hash')

  // Protected routes
  if (!user && !isPublicRoute && !hasAuthCode) {
    // Get the actual origin from headers (for ngrok/tunnels)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    const url = request.nextUrl.clone()
    
    // If forwarded headers exist (ngrok/tunnel), use those
    if (forwardedHost) {
      url.protocol = forwardedProto || 'https'
      url.host = forwardedHost
      if (!forwardedHost.includes(':')) url.port = ''
    }
    
    url.pathname = '/login'
    console.log('🔒 Middleware: No user, redirecting to login:', url.toString())
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if logged in and trying to access login
  if (user && request.nextUrl.pathname === '/login') {
    // Get the actual origin from headers (for ngrok/tunnels)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    const url = request.nextUrl.clone()
    
    // If forwarded headers exist (ngrok/tunnel), use those
    if (forwardedHost) {
      url.protocol = forwardedProto || 'https'
      url.host = forwardedHost
      if (!forwardedHost.includes(':')) url.port = ''
    }
    
    url.pathname = '/app'
    console.log('✅ Middleware: User logged in, redirecting from /login to:', url.toString())
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
