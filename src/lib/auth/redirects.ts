/**
 * Redirect safety for the auth flows. Two untrusted inputs feed these
 * redirects — the `x-forwarded-host` header and the `?next=` query param —
 * and both were used unchecked, which is an open redirect: a link on the
 * genuine domain could bounce a just-authenticated user to a lookalike.
 */

// Hosts we will honour from x-forwarded-host. Everything else falls back to
// the request's own origin. Tunnels for phone testing are matched by suffix.
const ALLOWED_HOSTS = new Set([
  'getrivet.ai',
  'www.getrivet.ai',
  'thefieldgenie.com',
  'www.thefieldgenie.com',
])

function hostAllowed(host: string): boolean {
  const bare = host.split(':')[0]
  if (ALLOWED_HOSTS.has(host) || ALLOWED_HOSTS.has(bare)) return true
  if (bare === 'localhost' || bare === '127.0.0.1') return true
  if (bare.endsWith('.vercel.app')) return true
  return false
}

/**
 * The origin to build redirects against. Trusts x-forwarded-host only when it
 * is a host we recognise; otherwise the request's own origin. This keeps
 * tunnel/preview testing working without trusting an arbitrary header.
 */
export function safeOrigin(request: Request): string {
  const url = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost && hostAllowed(forwardedHost)) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${forwardedHost}`
  }
  return url.origin
}

/**
 * A post-auth destination that cannot leave the site. Same-origin absolute
 * paths only: must start with a single `/` and not `//` or `/\` (both of
 * which browsers resolve as protocol-relative to another host).
 */
export function safeNext(next: string | null | undefined, fallback = '/app'): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
