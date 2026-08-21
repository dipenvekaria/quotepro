'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { openBillingPortal, startSubscription } from './billing-actions'

/**
 * The billing card. Pre-subscription: pick Solo or Team, card up front,
 * nothing charged for 14 days. Subscribed: one button to the Stripe portal,
 * where cancel takes effect at period end.
 */
export function BillingCard({
  plan,
  status,
  trialEndsAt,
  canEdit,
  prices,
}: {
  plan: string | null
  status: string | null
  trialEndsAt: string | null
  canEdit: boolean
  prices: { solo: string; team: string }
}) {
  const [busy, start] = useTransition()

  function go(fn: () => Promise<{ ok: true; data: { url: string } } | { ok: false; error: string }>) {
    start(async () => {
      const res = await fn()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      window.location.href = res.data.url
    })
  }

  const active = status === 'trialing' || status === 'active' || status === 'past_due'

  if (!active) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          14-day free trial on either size. Card up front, nothing charged until day 14,
          cancel anytime from this page.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="h-11 flex-1"
            disabled={!canEdit || busy}
            onClick={() => go(() => startSubscription('solo'))}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start Solo — ${prices.solo}/mo`}
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={!canEdit || busy}
            onClick={() => go(() => startSubscription('team'))}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start Team — ${prices.team}/mo`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium capitalize">{plan ?? 'team'}</span>
        {status === 'trialing' && trialEndsAt && (
          <span className="text-muted-foreground">
            {' '}— trial, first charge{' '}
            {new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </span>
        )}
        {status === 'active' && <span className="text-muted-foreground"> — active</span>}
        {status === 'past_due' && (
          <span className="text-amber-600 dark:text-amber-400"> — payment failed, update your card</span>
        )}
      </p>
      <Button
        variant="outline"
        className="h-11"
        disabled={!canEdit || busy}
        onClick={() => go(openBillingPortal)}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage billing'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Change plan, update card, download invoices, or cancel — cancelling keeps access
        until the end of what you&rsquo;ve paid for.
      </p>
    </div>
  )
}
