'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

import { disconnectQuickbooks } from './quickbooks-actions'

/**
 * Client half of the QuickBooks card: Connect is a plain navigation to the
 * OAuth route; Disconnect is an action. Status itself renders on the server.
 */
export function QuickbooksActions({
  connected,
  canEdit,
}: {
  connected: boolean
  canEdit: boolean
}) {
  const router = useRouter()
  const [busy, start] = useTransition()

  if (!canEdit) return null

  if (!connected) {
    return (
      <Button asChild className="h-11 lg:h-9">
        <a href="/api/integrations/quickbooks/connect">Connect QuickBooks</a>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className="h-11 lg:h-9"
      disabled={busy}
      onClick={() =>
        start(async () => {
          const res = await disconnectQuickbooks()
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          toast.success('QuickBooks disconnected — nothing new will sync.')
          router.refresh()
        })
      }
    >
      {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
      Disconnect
    </Button>
  )
}
