'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { acceptInvite } from '@/app/app/(shell)/settings/team-actions'

export function JoinAccept({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function accept() {
    setBusy(true)
    const res = await acceptInvite(token)
    if (!res.ok) {
      setBusy(false)
      toast.error(res.error)
      return
    }
    toast.success('Welcome to the team!')
    router.push('/app/dashboard')
    router.refresh()
  }

  return (
    <Button onClick={accept} disabled={busy} className="w-full gap-1.5">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      Accept &amp; join
    </Button>
  )
}
