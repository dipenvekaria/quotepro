'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PhoneIncoming } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { enableVoice } from './actions'

/**
 * The call-answering card. Enabled state shows the live number; setup asks for
 * the one thing code cannot decide — which number — and does the rest.
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
  const [phone, setPhone] = useState('')
  const [busy, start] = useTransition()

  if (!configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Coming soon — the answering service is being set up platform-side.
      </p>
    )
  }

  if (enabled && number) {
    return (
      <div className="space-y-1 text-sm">
        <p>
          Answering <span className="font-medium tabular">{number}</span>. Every finished call
          lands in the pipeline as a lead with the transcript attached.
        </p>
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
      const res = await enableVoice({ phone_number: phone.trim() })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Call answering is on')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        An assistant answers when you can&apos;t, collects the caller&apos;s name, address and
        what they need, and files it as a lead — transcript included. It never quotes prices.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="voice-number">Phone number</Label>
        <Input
          id="voice-number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+14155550123"
          className="h-11 max-w-xs tabular"
        />
        <p className="text-xs text-muted-foreground">
          The number must already be imported into Retell. Setup connects it to your company.
        </p>
      </div>
      <Button onClick={submit} disabled={busy || !phone.trim()} className="h-11 gap-1.5 lg:h-9">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneIncoming className="h-4 w-4" />}
        Turn on call answering
      </Button>
    </div>
  )
}
