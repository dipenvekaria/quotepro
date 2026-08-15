'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { deleteAccount, getDeletionImpact, type DeletionImpact } from './danger-actions'

/**
 * Closing the account.
 *
 * The dialog opens empty and asks the server what would actually be destroyed,
 * because a warning with real numbers in it — 47 customers, $12,400 still owed
 * — is read, and a generic "this cannot be undone" is not.
 *
 * The confirmation is the company name rather than the word DELETE. Typing your
 * own company's name is a moment of recognition; typing DELETE is muscle memory.
 */
export function DangerZone({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false)
  const [impact, setImpact] = useState<DeletionImpact | null>(null)
  const [typed, setTyped] = useState('')
  const [loading, startLoad] = useTransition()
  const [deleting, startDelete] = useTransition()

  function openDialog() {
    setTyped('')
    setImpact(null)
    setOpen(true)
    startLoad(async () => {
      const res = await getDeletionImpact()
      if (!res.ok) {
        toast.error(res.error)
        setOpen(false)
        return
      }
      setImpact(res.data)
    })
  }

  function confirm() {
    startDelete(async () => {
      const res = await deleteAccount({ confirmation: typed })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      // Signed out server-side already. A hard navigation rather than the
      // router, so nothing cached for the deleted account survives.
      window.location.href = '/login?deleted=1'
    })
  }

  const matches =
    impact !== null && typed.trim().toLowerCase() === impact.companyName.trim().toLowerCase()

  return (
    <section className="rounded-xl border border-destructive/30 bg-card shadow-sm">
      <header className="flex items-center gap-2 border-b border-destructive/20 px-5 py-3.5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-semibold">Close account</h2>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          {isOwner
            ? 'Closes this company and removes everything from Rivet — customers, quotes, jobs, invoices, your price book, and every login on the team. An archived copy is kept for 90 days in case you need it back, then permanently deleted.'
            : 'Deletes your login. Your company keeps its customers, quotes and jobs — you just lose access to them.'}
        </p>
        <Button variant="destructive" onClick={openDialog} className="shrink-0">
          {isOwner ? 'Close account' : 'Delete my login'}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isOwner ? 'Close this account?' : 'Delete your login?'}
            </DialogTitle>
            <DialogDescription>
              {isOwner
                ? 'Everything below leaves Rivet the moment you confirm. An archived copy is held for 90 days — getting it back means contacting support, not clicking undo.'
                : 'You will be signed out and will lose access to this company.'}
            </DialogDescription>
          </DialogHeader>

          {loading || !impact ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking what this would delete…
            </div>
          ) : (
            <div className="space-y-4">
              {impact.scope === 'company' && (
                <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:grid-cols-4">
                  <Stat label="Customers" value={impact.counts.customers} />
                  <Stat label="Quotes & jobs" value={impact.counts.workItems} />
                  <Stat label="Invoices" value={impact.counts.invoices} />
                  <Stat label="Price book" value={impact.counts.catalogItems} />
                </dl>
              )}

              {impact.unpaid.count > 0 && impact.scope === 'company' && (
                <Warning>
                  <strong className="font-semibold">
                    ${impact.unpaid.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  is still owed across {impact.unpaid.count}{' '}
                  {impact.unpaid.count === 1 ? 'invoice' : 'invoices'}. Closing takes those invoices
                  offline — your customers can no longer see or pay them.
                </Warning>
              )}

              {impact.stripeConnected && impact.scope === 'company' && (
                <Warning>
                  Stripe is still connected. Payouts already in flight will still arrive, but you
                  will no longer have the jobs they were for in front of you.
                </Warning>
              )}

              {impact.teammates > 0 && impact.scope === 'company' && (
                <Warning>
                  {impact.teammates} other {impact.teammates === 1 ? 'person' : 'people'} on your
                  team {impact.teammates === 1 ? 'loses' : 'lose'} their login immediately.
                </Warning>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="confirm-name">
                  Type <span className="font-semibold text-foreground">{impact.companyName}</span>{' '}
                  to confirm
                </Label>
                <Input
                  id="confirm-name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  placeholder={impact.companyName}
                  className="h-11"
                  disabled={deleting}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Keep my account
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={!matches || deleting}>
              {deleting ? 'Closing…' : isOwner ? 'Close the account' : 'Delete my login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular">{value.toLocaleString('en-US')}</dd>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-foreground">
      {children}
    </p>
  )
}
