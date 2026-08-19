'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinWaitlist } from './waitlist-actions'

/** Email capture for the pre-launch homepage. One field, one promise. */
export function WaitlistForm({ source }: { source: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()

  if (done) {
    return (
      <div className="flex h-12 items-center gap-2 text-sm font-medium">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
        You&rsquo;re on the list — we&rsquo;ll email you when the doors open.
      </div>
    )
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const res = await joinWaitlist({ email, source })
          if (!res.ok) {
            setError(res.error)
            return
          }
          setDone(true)
        })
      }}
    >
      <div className="flex-1">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
          aria-label="Your email address"
          autoComplete="email"
          className="h-12 text-base"
        />
        {error && <p className="mt-1 text-left text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={busy} className="h-12 px-5 text-base">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get early access'}
        {!busy && <ArrowRight className="ml-1 h-4 w-4" />}
      </Button>
    </form>
  )
}
