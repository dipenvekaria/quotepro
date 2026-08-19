import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // One canonical host. Three hostnames serve this deployment; search engines
  // treat that as three duplicate sites, so the secondaries 308 to the brand
  // domain. Exact-match only — localhost and *.vercel.app previews unaffected.
  const host = request.headers.get('host') ?? ''
  if (host === 'thefieldgenie.com' || host === 'www.thefieldgenie.com' || host === 'www.getrivet.ai') {
    const url = new URL(request.url)
    url.protocol = 'https:'
    url.host = 'getrivet.ai'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  return await updateSession(request)
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest)$).*)',
  ],
}
