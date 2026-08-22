'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarClock, CheckCircle2, DollarSign, Eye, Loader2, MessageSquare, PhoneIncoming } from 'lucide-react'

import { listNotifications, markAllNotificationsRead, type NotificationRow } from './notifications-actions'

const KIND_ICON: Record<string, typeof Bell> = {
  mention: MessageSquare,
  assigned: CalendarClock,
  quote_accepted: CheckCircle2,
  quote_viewed: Eye,
  payment: DollarSign,
  voice_lead: PhoneIncoming,
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/**
 * The top-bar bell. Opening it fetches the latest 20 and clears the badge —
 * reading the list is reading them; unread rows keep a dot until then.
 */
export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(initialUnread)
  const [items, setItems] = useState<NotificationRow[] | null>(null)
  const [loading, startLoad] = useTransition()

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    startLoad(async () => {
      const res = await listNotifications()
      if (res.ok) {
        setItems(res.data)
        if (res.data.some((n) => !n.read_at)) {
          setUnread(0)
          await markAllNotificationsRead()
        }
      }
    })
  }

  function go(n: NotificationRow) {
    setOpen(false)
    if (n.href) router.push(n.href)
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-lg text-muted-foreground transition-[background-color,transform] hover:bg-muted hover:text-foreground active:scale-95 lg:h-9 lg:w-9"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away, same pattern as the user menu */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-[3.75rem] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-1.5 sm:w-[360px]">
            <div className="border-b border-border/70 px-4 py-2.5 text-sm font-semibold">
              Notifications
            </div>
            <div className="max-h-[60dvh] overflow-y-auto">
              {loading && !items ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : !items || items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nothing yet. Mentions, assignments, and quote activity land here.
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {items.map((n) => {
                    const Icon = KIND_ICON[n.kind] ?? Bell
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => go(n)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium">{n.title}</span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {ago(n.created_at)}
                              </span>
                            </span>
                            {n.body && (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                {n.body}
                              </span>
                            )}
                          </span>
                          {!n.read_at && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
