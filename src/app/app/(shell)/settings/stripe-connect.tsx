'use client'

import { useTransition } from 'react'
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------

export function StripeConnect({
  connected,
  chargesEnabled,
  detailsSubmitted,
  passCardFees,
  canEdit,
}: {
  connected: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  passCardFees: boolean
  canEdit: boolean
}) {
  const [busy, startBusy] = useTransition()

  function connect() {
    startBusy(async () => {
      try {
        const res = await fetch('/api/stripe/connect', { method: 'POST' })
        const data = await res.json() as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          toast.error(data.error ?? 'Could not start Stripe onboarding.')
          return
        }
        window.location.href = data.url
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Network error')
      }
    })
  }

  const ready = connected && chargesEnabled

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
            ready
              ? 'bg-emerald-500/10 text-emerald-600'
              : connected
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {ready ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {ready ? 'Ready to accept payments' : connected ? 'Finish Stripe onboarding' : 'Connect Stripe'}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ready
              ? 'Customers can pay invoices by bank (0.8% capped at $5) or card. Funds land directly in your Stripe account.'
              : connected
                ? 'Stripe still needs a few more details — click below to complete onboarding.'
                : 'Bring your own Stripe account. Cheapest option is bank transfer — capped at $5 per invoice.'}
          </p>
          {connected && !ready && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {!detailsSubmitted && 'Details submitted: no. '}
              {detailsSubmitted && !chargesEnabled && 'Charges enabled: not yet.'}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Once charges are enabled there is nothing left to onboard —
              account changes happen in Stripe's own dashboard. */}
          {!ready && (
            <Button onClick={connect} disabled={busy} className="h-9 gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              {connected ? 'Continue onboarding' : 'Connect Stripe'}
            </Button>
          )}
          {ready && (
            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              Open Stripe dashboard <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      {!canEdit && (
        <p className="text-xs text-muted-foreground">Only owners and admins can manage payment integrations.</p>
      )}

      {/* Options */}
      {ready && canEdit && (
        <div className="border-t border-border/70 pt-4">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Options</div>
          <label className="mt-2 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              defaultChecked={passCardFees}
              onChange={async (e) => {
                const res = await fetch('/api/settings/pass-card-fees', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pass_card_fees: e.target.checked }),
                })
                if (!res.ok) {
                  toast.error('Could not save preference.')
                  e.target.checked = !e.target.checked
                } else {
                  toast.success(e.target.checked ? 'Card fees now passed to customer.' : 'Card fees now absorbed.')
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              <div className="font-medium">Pass card processing fees to customer</div>
              <div className="text-xs text-muted-foreground">
                Adds ~2.9% + $0.30 to card payments so you take home 100%. Bank transfers stay free to the payer.
              </div>
            </span>
          </label>
        </div>
      )}
    </div>
  )
}
