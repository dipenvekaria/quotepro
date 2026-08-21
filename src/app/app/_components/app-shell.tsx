'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { BarChart3, Calendar, ChevronDown, Home, Image as ImageIcon, Inbox, Loader2, LogOut, Menu, Package, Plug, Plus, Settings, Users, X, Zap, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BRAND_NAME, BrandMark } from '@/components/brand/logo'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'

import { HelpPanel } from './help-panel'
import { MobileTabBar } from './mobile-tab-bar'

// ---------------------------------------------------------------------------

type Company = { id: string; name: string; logo_url: string | null } | null

const NAV = [
  { href: '/app/dashboard',    label: 'Home',         icon: Home },
  { href: '/app/pipeline',     label: 'Pipeline',     icon: Inbox },
  { href: '/app/calendar',     label: 'Calendar',     icon: Calendar },
  { href: '/app/customers',    label: 'Customers',    icon: Users },
  { href: '/app/catalog',      label: 'Price book',   icon: Package },
  { href: '/app/portfolio',    label: 'Portfolio',    icon: ImageIcon },
  { href: '/app/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/app/integrations', label: 'Integrations', icon: Plug },
]

// Mobile-first sizing. A technician taps this standing in a driveway, so rows
// clear the 44px minimum on touch and only shrink to the compact desktop scale
// at lg. `active:` matters more than `hover:` here — hover does not exist on
// touch, and globals.css clears the tap highlight, so without it a tap gives no
// feedback whatsoever.
const NAV_ITEM =
  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-[background-color,transform] active:scale-[0.98] lg:min-h-0 lg:gap-2.5 lg:py-1.5 lg:text-sm'
const NAV_ITEM_ACTIVE = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
const NAV_ITEM_IDLE =
  'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground'

// Swaps the icon for a spinner while the destination is being fetched. App
// Router navigation is a server round-trip; without this the row just sits
// there and people tap it again.
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus()
  return pending ? (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin" role="status" aria-label="Loading" />
  ) : (
    <Icon className="h-4 w-4 shrink-0" aria-hidden />
  )
}

// ---------------------------------------------------------------------------

export function AppShell({
  user,
  profile,
  company,
  children,
}: {
  user: { id: string; email: string }
  profile: Record<string, unknown>
  company: Company
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [boltOpen, setBoltOpen] = useState(false)
  const pathname = usePathname()
  const initials = getInitials(profile, user.email)

  // Close mobile nav on route change. Syncing to an external event (navigation)
  // is what effects are for; there is no render-time value to derive this from.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <Sidebar
        company={company}
        pathname={pathname}
        className="hidden lg:flex"
        onAskBolt={() => setBoltOpen((v) => !v)}
      />

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl lg:hidden">
            <Sidebar
              company={company}
              pathname={pathname}
              className="flex h-full"
              onClose={() => setMobileNavOpen(false)}
              onAskBolt={() => {
                setMobileNavOpen(false)
                setBoltOpen(true)
              }}
            />
          </div>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          company={company}
          email={user.email}
          initials={initials}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">{children}</main>
      </div>
      <MobileTabBar onAskBolt={() => setBoltOpen(true)} />
      <HelpPanel open={boltOpen} onClose={() => setBoltOpen(false)} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function Sidebar({
  company,
  pathname,
  className,
  onClose,
  onAskBolt,
}: {
  company: Company
  pathname: string
  className?: string
  onClose?: () => void
  onAskBolt: () => void
}) {
  return (
    <aside
      className={cn(
        'w-60 shrink-0 flex-col border-r border-border/70 bg-sidebar px-3 py-4',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/app/dashboard"
          className="group flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent"
        >
          <BrandMark tile="h-8 w-8" mark="h-5 w-5" />
          <div className="flex-1 truncate">
            <div className="truncate text-sm font-semibold">{BRAND_NAME}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {company?.name ?? 'Setup pending'}
            </div>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground transition-transform hover:bg-muted active:scale-95 active:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="mt-6 space-y-0.5">
        {NAV.map((n) => {
          const active =
            pathname === n.href || (n.href !== '/app/dashboard' && pathname.startsWith(n.href))
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className={cn(NAV_ITEM, active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
            >
              <NavIcon icon={n.icon} />
              <span className="flex-1 truncate">{n.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Settings and identity live in the top-bar avatar menu; repeating them
          here bought nothing. The slot goes to Bolt instead. */}
      <div className="mt-auto pt-4">
        <button type="button" onClick={onAskBolt} className={cn(NAV_ITEM, NAV_ITEM_IDLE, 'w-full')}>
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate text-left">Ask Bolt</span>
        </button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------

function TopBar({
  company,
  email,
  initials,
  menuOpen,
  setMenuOpen,
  onOpenMobileNav,
}: {
  company: Company
  email: string
  initials: string
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  onOpenMobileNav: () => void
}) {
  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background px-3 sm:px-4 lg:px-10">
      {/* Mobile menu button */}
      <button
        onClick={onOpenMobileNav}
        className="grid h-11 shrink-0 w-11 place-items-center rounded-lg text-muted-foreground transition-[background-color,transform] hover:bg-muted hover:text-foreground active:scale-95 active:bg-muted active:text-foreground lg:h-9 lg:w-9 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile brand */}
      <Link href="/app/dashboard" className="flex min-h-11 items-center gap-1.5 lg:hidden">
        <BrandMark tile="h-7 w-7" mark="h-4 w-4" />
        <span className="text-sm font-semibold sm:hidden">
          {company?.name?.split(' ')[0] ?? BRAND_NAME}
        </span>
      </Link>

      {/*
        A global search box lived here with no handler behind it. Beside a list
        search that works — the one on Customers — it read as two search bars,
        one of which silently ignored you. A control that does nothing is worse
        than an absent one: it teaches people the app is broken.

        It comes back when it does something: a command palette over customers,
        quotes, jobs and the catalog. pg_trgm is already on customers.name.
      */}

      <div className="ml-auto flex items-center gap-1">
        {/* The bell had no handler either, and no notifications exist to show. */}

        <Link
          href="/app/quotes/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-[15px] font-medium text-primary-foreground shadow-sm transition-transform hover:opacity-90 active:scale-95 sm:px-3 lg:min-h-0 lg:py-1.5 lg:text-sm"
        >
          <Plus className="h-4 w-4" />
          {/* The app's primary action was an unlabeled circle on phones. */}
          <span>New quote</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-1 flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-1 py-1 transition-transform hover:bg-muted active:scale-95 active:bg-muted sm:ml-2 sm:gap-1.5 sm:px-1.5 lg:min-h-0 lg:min-w-0"
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-semibold">{initials}</span>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          </button>
          {menuOpen && <UserMenu email={email} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------

function UserMenu({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-popover p-1.5 shadow-card">
        <div className="border-b border-border/70 px-2 py-2">
          <div className="truncate text-sm font-medium">{email}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Signed in</div>
        </div>
        <Link
          href="/app/settings"
          onClick={onClose}
          className="flex min-h-11 items-center gap-2 rounded-md px-2 py-2.5 text-[15px] transition-[background-color,transform] hover:bg-muted active:scale-[0.98] active:bg-muted lg:min-h-0 lg:py-1.5 lg:text-sm"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <form action={signOut}>
          <SignOutButton />
        </form>
      </div>
    </>
  )
}

function SignOutButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant="ghost"
      className="min-h-11 w-full justify-start gap-2 px-2 py-2.5 text-[15px] font-normal active:scale-[0.98] lg:min-h-0 lg:py-1.5 lg:text-sm"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Signing out" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}

// ---------------------------------------------------------------------------

function getInitials(profile: Record<string, unknown>, email: string): string {
  const first = String(profile.first_name ?? '').trim()
  const last = String(profile.last_name ?? '').trim()
  const combined = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
  if (combined) return combined
  return (email[0] ?? 'U').toUpperCase()
}
