'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

import { BoltChat } from '@/app/app/(shell)/help/bolt-chat'
import { MessageUs } from '@/app/app/(shell)/help/message-us'

/**
 * The floating help bubble, on every page. Desktop: a corner card. Phones:
 * the bubble floats above the sticky-action zone (tab bar + any bottom
 * action bar carry the real work, so the bubble clears both) and opens a
 * bottom sheet.
 */
export function HelpLauncher() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl sm:inset-x-auto sm:bottom-20 sm:right-5 sm:max-h-none sm:w-[26rem] sm:max-w-[calc(100vw-2.5rem)] sm:rounded-2xl sm:border">
            <div className="flex items-center justify-end border-b border-border/60 px-2 py-1 sm:hidden">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground"
              >
                <X className="h-5 w-5" />
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
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close help' : 'Open help'}
        aria-expanded={open}
        className="fixed bottom-36 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:bottom-5 sm:right-5"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  )
}
