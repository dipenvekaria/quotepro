'use client'

import { X } from 'lucide-react'

import { BoltChat } from '@/app/app/(shell)/help/bolt-chat'
import { MessageUs } from '@/app/app/(shell)/help/message-us'

/**
 * The Bolt panel. No floating bubble — that pattern read as dated; the
 * triggers live in the nav (sidebar footer on desktop, the More sheet on
 * phones). Phones get a bottom sheet; from sm it is a card anchored
 * bottom-left, by its trigger.
 */
export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm sm:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-h-none sm:w-[26rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border lg:left-[16rem]">
        <div className="flex items-center justify-end border-b border-border/60 px-2 py-1">
          <button
            onClick={onClose}
            aria-label="Close Ask Bolt"
            className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted sm:h-9 sm:w-9"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
        <div className="overflow-y-auto sm:max-h-[65vh]">
          <BoltChat />
          <div className="border-t border-border/70 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Rather talk to a human?
            </p>
            <MessageUs compact />
          </div>
        </div>
      </div>
    </>
  )
}
