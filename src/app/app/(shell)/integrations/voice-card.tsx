'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PhoneIncoming } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { enableVoice } from './actions'

/**
 * The call-answering card. One toggle-shaped action: turn it on and a local
 * number is bought and bound behind the scenes — the contractor never learns
 * what telephony is. The manual path (a number already in the platform's
 * Retell workspace) folds away for admin use.
 */
export function VoiceCard({
  configured,
  enabled,
  number,
  canEdit,
}: {
  configured: boolean
  enabled: boolean
  number: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [busy, start] = useTransition()

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Coming soon — the answering service is being set up platform-side.
      </p>
    )
  }

  if (enabled && number) {
    const pretty = number.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
    return (
      <div className="space-y-3 text-sm">
        <p>
          Answering <span className="font-medium tabular">{pretty}</span>. Every finished call
          lands in the pipeline as a lead with the transcript attached.
        </p>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="font-medium">Connect your existing number</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set your business phone to forward unanswered calls here, and the assistant picks up
            whenever you can&apos;t.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              Verizon: dial <span className="font-medium tabular text-foreground">*71{number.replace('+1', '')}</span>
            </li>
            <li>
              AT&amp;T / T-Mobile: dial <span className="font-medium tabular text-foreground">**004*{number}#</span>
            </li>
            <li>Landline or VoIP: turn on &ldquo;forward when unanswered&rdquo; in your phone system.</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Or publish it directly as your business line — it answers every call either way.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Included minutes: 100 a month on Solo, 300 on Team.
        </p>
      </div>
    )
  }

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">The owner can turn this on.</p>
  }

  function submit() {
    start(async () => {
      const res = await enableVoice()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Call answering is on', {
        description: `Your number: ${res.data.number}. Setup instructions are in your inbox.`,
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        An assistant answers when you can&apos;t — after hours or mid-job — collects the
        caller&apos;s name, address and what they need, and files it as a lead with the
        transcript. It never quotes prices. Turning it on assigns your company a number;
        callers never see it — they dial your own number, which forwards when you don&apos;t
        pick up.
      </p>
      <Button onClick={submit} disabled={busy} className="h-11 gap-1.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
        Turn on call answering
      </Button>
    </div>
  )
}
