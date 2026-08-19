'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { dismissGettingStarted } from './actions'

/** The card's dismiss control. The checklist itself lives on in Settings. */
export function DismissGettingStarted() {
  const router = useRouter()
  const [busy, start] = useTransition()
  return (
    <button
      type="button"
      disabled={busy}
      aria-label="Dismiss getting started — it stays available in Settings"
      title="Dismiss — find it later in Settings"
      onClick={() =>
        start(async () => {
          await dismissGettingStarted()
          router.refresh()
        })
      }
      className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  )
}
