'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookText,
  Image as ImageIcon,
  Zap,
  CalendarDays,
  ClipboardList,
  Home,
  LayoutGrid,
  Plug2,
  Settings,
  Users,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Bottom tabs on phones — the trading-app pattern the owner asked for.
 *
 * A tradesman's daily loop is dashboard → pipeline → calendar → a customer;
 * those are one thumb-tap each instead of hamburger → menu → item. Everything
 * visited weekly rather than hourly lives behind More. Five targets — the
 * trading-app density the owner asked for — still clear 44px at 375px.
 * Desktop keeps the sidebar; this renders under sm only.
 */

const TABS = [
  { href: '/app/dashboard', label: 'Home', icon: Home },
  { href: '/app/pipeline', label: 'Pipeline', icon: ClipboardList },
  { href: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/app/customers', label: 'Customers', icon: Users },
] as const

const MORE = [
  { href: '/app/catalog', label: 'Price book', icon: BookText },
  { href: '/app/portfolio', label: 'Portfolio', icon: ImageIcon },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/integrations', label: 'Integrations', icon: Plug2 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
] as const

export function MobileTabBar({ onAskBolt }: { onAskBolt: () => void }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
  const moreActive = MORE.some((m) => isActive(m.href))

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm sm:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}

      {moreOpen && (
        <div
          role="dialog"
          aria-label="More"
          className="fixed inset-x-0 bottom-16 z-50 mx-3 mb-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl sm:hidden"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
            <span className="text-xs font-semibold">More</span>
            <button
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false)
              onAskBolt()
            }}
            className="flex min-h-12 w-full items-center gap-2.5 border-b border-border/70 px-4 text-sm font-medium hover:bg-muted/60"
          >
            <Zap className="h-4 w-4 text-muted-foreground" />
            Ask Bolt
          </button>
          <div className="grid grid-cols-2">
            {MORE.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex min-h-12 items-center gap-2.5 px-4 text-sm',
                  isActive(m.href) ? 'font-medium text-primary' : 'text-foreground hover:bg-muted/60',
                )}
              >
                <m.icon className="h-4 w-4 text-muted-foreground" />
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {TABS.map((t) => {
          const active = isActive(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center justify-center gap-1',
            moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  )
}
