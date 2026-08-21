import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import { safeNext, safeOrigin } from '@/lib/auth/redirects'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNext(requestUrl.searchParams.get('next'))
  const origin = safeOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Route through /app — it decides onboarding vs dashboard.
        return NextResponse.redirect(new URL(next, origin).toString())
      }
    }
  }

  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'Unable to authenticate')
  return NextResponse.redirect(loginUrl.toString())
}
