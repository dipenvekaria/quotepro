'use client'

import { useState, useTransition } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { addPlatformAdmin, removePlatformAdmin } from './actions'

export function AdminsCard({ admins, self }: { admins: { email: string }[]; self: string }) {
  const [email, setEmail] = useState('')
  const [busy, start] = useTransition()

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {admins.map((a) => (
          <li key={a.email} className="flex min-h-9 items-center justify-between gap-2 text-sm">
            <span className="truncate">{a.email}{a.email === self.toLowerCase() ? ' (you)' : ''}</span>
            {a.email !== self.toLowerCase() && (
              <button
                aria-label={`Remove ${a.email}`}
                onClick={() =>
                  start(async () => {
                    const res = await removePlatformAdmin({ email: a.email })
                    if (!res.ok) toast.error(res.error)
                  })
                }
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const res = await addPlatformAdmin({ email })
            if (!res.ok) {
              toast.error(res.error)
              return
            }
            setEmail('')
            toast.success('Access granted — they sign in with Google using that email.')
          })
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
        />
        <Button type="submit" disabled={busy || !email} className="h-9">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant access'}
        </Button>
      </form>
    </div>
  )
}
