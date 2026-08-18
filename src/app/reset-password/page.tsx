'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

/**
 * Where the email's reset link lands. The link carries either a PKCE `?code=`
 * or an OTP `?token_hash=&type=recovery` depending on project config — both
 * are exchanged here for a session, and then the only thing this page does is
 * set the new password. A visitor with neither (bookmarked, expired, or typed
 * by hand) gets sent to request a fresh link rather than a dead form.
 */

// The auth code is single-use, and React strict mode runs effects twice in
// dev — two racing exchanges both came back 400 and a working link read as
// broken. Module scope survives the double-mount; the promise is shared so
// the second run awaits the first instead of re-spending the code.
let exchangeOnce: Promise<boolean> | null = null
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [state, setState] = useState<'exchanging' | 'ready' | 'invalid'>('exchanging')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    exchangeOnce ??= (async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          })
          if (error) throw error
        } else {
          // No token in the URL — maybe a session already exists (refresh
          // after a completed exchange).
          const { data } = await supabase.auth.getUser()
          if (!data.user) throw new Error('no session')
        }
        // Strip the one-time token from the address bar and history.
        window.history.replaceState(null, '', '/reset-password')
        return true
      } catch (e) {
        console.error('reset-password link exchange failed', e)
        return false
      }
    })()

    exchangeOnce.then((ok) => {
      if (!cancelled) setState(ok ? 'ready' : 'invalid')
      // A failed exchange should not poison a retry with a fresh link.
      if (!ok) exchangeOnce = null
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('The passwords do not match.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated — you are signed in.')
    router.push('/app')
    router.refresh()
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {state === 'exchanging' && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </div>
        )}

        {state === 'invalid' && (
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">That link didn&rsquo;t work</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Reset links are single-use and expire after an hour. Request a fresh one and use it
              from this device.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              Send a new link
            </Link>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Choose a new password</h1>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Repeat it</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={saving} className="h-11 w-full gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Set password and sign in
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
