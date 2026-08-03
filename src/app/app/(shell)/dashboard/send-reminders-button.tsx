'use client'

import { useTransition } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { sendOverdueReminders } from '@/features/invoices/reminders'

export function SendRemindersButton() {
  const [busy, startBusy] = useTransition()

  function send() {
    startBusy(async () => {
      const res = await sendOverdueReminders()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (res.data.sent === 0 && res.data.skipped === 0) {
        toast.info('No overdue invoices to remind.')
      } else {
        toast.success(
          `Reminders sent: ${res.data.sent}${res.data.skipped ? ` · skipped ${res.data.skipped}` : ''}`,
        )
      }
    })
  }

  return (
    <button
      onClick={send}
      disabled={busy}
      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      Send reminders now
    </button>
  )
}
