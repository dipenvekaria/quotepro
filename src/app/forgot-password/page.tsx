'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

/**
 * The sign-in page has linked here since launch; the page did not exist, so a
 * contractor who forgot their password was locked out permanently while the UI
 * promised otherwise.
 *
 * The success state never reveals whether the address has an account —
 * "you'll get a link if an account exists" — because a different answer per
 * address is an account-enumeration oracle on a public page.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    } finally {
      // Same outcome either way — see the enumeration note above.
      setSending(false)
      setSent(true)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/30 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              a reset link is on its way. It expires in an hour.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the email you signed up with and we&rsquo;ll send a reset link.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={sending || !email.trim()} className="h-11 w-full gap-1.5">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
            <Link
              href="/login"
              className="mt-4 inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
