'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Loader2, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ROLE_PERSONAS } from '@/lib/team-personas'

import { inviteTeammate, revokeInvitation } from './team-actions'

export function InviteTeammateDialog() {
  // Opens automatically when arriving from the dashboard setup checklist
  // (/app/settings?invite=1). Derived at init rather than set from an effect —
  // window is unavailable during SSR, hence the guard.
  const [open, setOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('invite') !== null,
  )
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('technician')
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [emailed, setEmailed] = useState(false)


  function reset() {
    setOpen(false)
    setEmail('')
    setRole('technician')
    setLink(null)
    setEmailed(false)
  }

  async function submit() {
    if (!email.trim()) {
      toast.error('Enter an email address')
      return
    }
    setBusy(true)
    const res = await inviteTeammate({ email, role })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setLink(res.data.link)
    setEmailed(res.data.emailed)
    toast.success(res.data.emailed ? `Invite emailed to ${res.data.email}` : 'Invite link ready')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 lg:min-h-0 lg:px-2.5"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite teammate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={reset}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <div className="text-sm font-semibold">Invite a teammate</div>
              <button
                onClick={reset}
                className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted lg:h-7 lg:w-7"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            {link ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Check className="h-4 w-4" />
                  Invitation ready
                </div>
                <p className="text-xs text-muted-foreground">
                  {emailed
                    ? 'We emailed the invite. You can also share this link:'
                    : 'Share this link with your teammate to join:'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(link)
                      toast.success('Link copied')
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => { setLink(null); setEmail('') }}>
                    Invite another
                  </Button>
                  <Button onClick={reset}>Done</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Role</label>
                  <div className="space-y-1.5">
                    {ROLE_PERSONAS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setRole(p.value)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                          role === p.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                            role === p.value
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border',
                          )}
                        >
                          {role === p.value && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{p.label}</span>
                          <span className="block text-xs text-muted-foreground">{p.blurb}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={reset}>
                    Cancel
                  </Button>
                  <Button onClick={submit} disabled={busy} className="gap-1.5">
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Send invite
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function RevokeInviteButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const res = await revokeInvitation(id)
        if (!res.ok) {
          setBusy(false)
          toast.error(res.error)
          return
        }
        toast.success('Invite revoked')
      }}
      className="text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      Revoke
    </button>
  )
}
