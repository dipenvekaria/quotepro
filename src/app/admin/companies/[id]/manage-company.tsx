'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Gift, Loader2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { extendCompanyTrial, saveCompanyNotes, setCompanyComplimentary } from '../../actions'

/**
 * The levers. Deliberately generic — extend a trial, comp the account, leave a
 * note — so unforeseen situations have a tool rather than a feature request.
 */
export function ManageCompany({
  companyId,
  complimentary,
  trialEndsAt,
  hasStripeSub,
  notes,
}: {
  companyId: string
  complimentary: boolean
  trialEndsAt: string | null
  hasStripeSub: boolean
  notes: string
}) {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [noteDraft, setNoteDraft] = useState(notes)
  const [busy, start] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    start(async () => {
      const res = await fn()
      if (!res.ok) {
        toast.error(res.error ?? 'Something went wrong')
        return
      }
      toast.success(done)
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Manage</h2>

      <div className="mt-4 space-y-5">
        {/* Trial extension */}
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <CalendarPlus className="h-4 w-4 text-muted-foreground" /> Extend trial
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adds to {trialEndsAt ? `the current end (${new Date(trialEndsAt).toLocaleDateString()})` : 'today'}
            {hasStripeSub && ' and pushes the Stripe trial, delaying the first charge'}.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              className="h-11 w-24 rounded-md border border-input bg-background px-3 text-sm tabular shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-9"
              aria-label="Days to add"
            />
            <span className="text-sm text-muted-foreground">days</span>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(() => extendCompanyTrial({ company_id: companyId, days }), `Trial extended ${days} days`)}
              className="h-11 gap-1.5 lg:h-9"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Extend
            </Button>
          </div>
        </div>

        {/* Complimentary */}
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Gift className="h-4 w-4 text-muted-foreground" /> Complimentary access
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {complimentary
              ? 'On — this company is never locked for billing and pays nothing.'
              : 'Free run of the product regardless of billing state — for early adopters and favours.'}
            {!complimentary && hasStripeSub && ' Their Stripe subscription keeps charging unless cancelled in Stripe.'}
          </p>
          <Button
            variant={complimentary ? 'outline' : 'default'}
            disabled={busy}
            onClick={() =>
              run(
                () => setCompanyComplimentary({ company_id: companyId, complimentary: !complimentary }),
                complimentary ? 'Complimentary access revoked' : 'Complimentary access granted',
              )
            }
            className="mt-2 h-11 gap-1.5 lg:h-9"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {complimentary ? 'Revoke' : 'Grant'}
          </Button>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <StickyNote className="h-4 w-4 text-muted-foreground" /> Notes
          </div>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="Context for future you — what was promised, why, when."
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            variant="outline"
            disabled={busy || noteDraft === notes}
            onClick={() => run(() => saveCompanyNotes({ company_id: companyId, notes: noteDraft }), 'Notes saved')}
            className="mt-2 h-11 lg:h-9"
          >
            Save notes
          </Button>
        </div>
      </div>
    </section>
  )
}
