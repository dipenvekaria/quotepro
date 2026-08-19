'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { contactSupport } from './actions'

/** The human channel. One box; the reply arrives in their email. */
export function MessageUs({ compact = false }: { compact?: boolean }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, start] = useTransition()

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
        Sent — a human reads it and replies to your email.
      </div>
    )
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await contactSupport({ message })
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          setSent(true)
        })
      }}
    >
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={compact ? 2 : 3}
        placeholder="Tell us what's going on — a human reads every message."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      />
      <Button type="submit" disabled={busy || message.trim().length < 3} className="h-11 lg:h-9">
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Message us
      </Button>
    </form>
  )
}
