import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { buildCsp } from '@/lib/security/csp'

export async function middleware(request: NextRequest) {
  // Per-request nonce for the CSP. Framework and our inline scripts carry it;
  // everything else inline is refused. Threaded to Server Components via the
  // x-nonce request header, and set as the CSP header on the page response.
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce, process.env.NODE_ENV !== 'production')
  // Two hosts, two jobs. getrivet.ai is the product; thefieldgenie.com is the
  // operations portal and serves only /admin — so an error on the product
  // domain can never expose platform data, and vice versa. localhost and
  // *.vercel.app previews are exempt so development and preview testing work.
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname
  const isAdminPath = path === '/admin' || path.startsWith('/admin/')

  if (host === 'www.thefieldgenie.com' || host === 'thefieldgenie.com') {
    const url = new URL(request.url)
    url.protocol = 'https:'
    url.port = ''
    if (isAdminPath || path === '/login' || path.startsWith('/auth')) {
      // The portal needs its own sign-in round trip; everything else leaves.
      if (host === 'www.thefieldgenie.com') {
        url.host = 'thefieldgenie.com'
        return NextResponse.redirect(url, 308)
      }
      return await updateSession(request, nonce, csp)
    }
    if (path === '/') {
      url.host = 'thefieldgenie.com'
      url.pathname = '/admin'
      return NextResponse.redirect(url, 308)
    }
    url.host = 'getrivet.ai'
    return NextResponse.redirect(url, 308)
  }

  if (host === 'www.getrivet.ai') {
    const url = new URL(request.url)
    url.protocol = 'https:'
    url.host = 'getrivet.ai'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  if (host === 'getrivet.ai' && isAdminPath) {
    // The product domain does not acknowledge the portal.
    const url = request.nextUrl.clone()
    url.pathname = '/admin-does-not-live-here'
    return NextResponse.rewrite(url, { status: 404 })
  }

  return await updateSession(request, nonce, csp)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     *
     * `api` was named in this comment but missing from the pattern, so every
     * API route was being redirected to /login. Callers that cannot follow a
     * redirect or hold a session were silently broken by it: Stripe's webhooks
     * (so payments were never recorded), the customer-facing checkout link, and
     * the scheduled follow-up sweep. Each API route authenticates itself — a
     * Stripe signature, a public token, a bearer secret, or auth.getUser() —
     * so none of them relied on this.
     */
    // manifest.json and .ico are excluded by extension: the PWA manifest was
    // being 307'd to /login, which broke install prompts on the custom domains.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt|xml)$).*)',
  ],
}
