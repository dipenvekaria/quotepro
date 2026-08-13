import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
