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
  const publicRoutes = ['/login', '/auth', '/pricing']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Protected routes
  if (!user && !isPublicRoute) {
    // Get the actual origin from headers (for ngrok/tunnels)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    const url = request.nextUrl.clone()
    
    // If forwarded headers exist (ngrok/tunnel), use those
    if (forwardedHost) {
      url.protocol = forwardedProto || 'https'
      url.host = forwardedHost
      url.port = '' // Remove port for tunnels
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
      url.port = '' // Remove port for tunnels
    }
    
    url.pathname = '/dashboard'
    console.log('✅ Middleware: User logged in, redirecting from /login to:', url.toString())
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
