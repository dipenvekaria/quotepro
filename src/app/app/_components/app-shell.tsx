'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  Command,
  Home,
  Inbox,
  LogOut,
  Menu,
  Package,
  Plug,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------

type Company = { id: string; name: string; logo_url: string | null } | null

const NAV = [
  { href: '/app/dashboard',    label: 'Home',         icon: Home },
  { href: '/app/pipeline',     label: 'Pipeline',     icon: Inbox },
  { href: '/app/calendar',     label: 'Calendar',     icon: Calendar },
  { href: '/app/customers',    label: 'Customers',    icon: Users },
  { href: '/app/catalog',      label: 'Catalog',      icon: Package },
  { href: '/app/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/app/integrations', label: 'Integrations', icon: Plug },
]

// ---------------------------------------------------------------------------

export function AppShell({
  user,
  profile,
  role,
  company,
  children,
}: {
  user: { id: string; email: string }
  profile: Record<string, unknown>
  role: string
  company: Company
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const initials = getInitials(profile, user.email)

  // Close mobile nav on route change.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <Sidebar company={company} role={role} initials={initials} pathname={pathname} className="hidden lg:flex" />

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
              role={role}
              initials={initials}
              pathname={pathname}
              className="flex h-full"
              onClose={() => setMobileNavOpen(false)}
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
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Sidebar({
  company,
  role,
  initials,
  pathname,
  className,
  onClose,
}: {
  company: Company
  role: string
  initials: string
  pathname: string
  className?: string
  onClose?: () => void
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
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 truncate">
            <div className="truncate text-sm font-semibold">QuotePro</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {company?.name ?? 'Setup pending'}
            </div>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
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
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <n.icon className="h-4 w-4" />
              <span className="flex-1 truncate">{n.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-0.5 pt-4">
        <Link
          href="/app/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm',
            pathname.startsWith('/app/settings')
              ? 'bg-sidebar-accent font-medium'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent',
          )}
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="text-xs font-semibold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium capitalize">{role}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {company?.name ?? 'Personal'}
            </div>
          </div>
        </div>
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
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile brand */}
      <Link href="/app/dashboard" className="flex items-center gap-1.5 lg:hidden">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold sm:hidden">
          {company?.name?.split(' ')[0] ?? 'QuotePro'}
        </span>
      </Link>

      {/* Search (hidden on mobile) */}
      <button className="group hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-border/80 md:flex">
        <Search className="h-4 w-4" />
        <span className="flex-1">Search or ask AI…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Search icon on mobile */}
        <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
          <Search className="h-4 w-4" />
        </button>

        <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>

        <Link
          href="/app/quotes/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 sm:px-3"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New quote</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-1 flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted sm:ml-2 sm:gap-1.5 sm:px-1.5"
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
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
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
      className="w-full justify-start gap-2 px-2 py-1.5 text-sm font-normal"
    >
      <LogOut className="h-4 w-4" />
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
