'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  Command,
  Home,
  Inbox,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Company = { id: string; name: string; logo_url: string | null } | null

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
  const initials = getInitials(profile, user.email)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar company={company} role={role} initials={initials} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          email={user.email}
          initials={initials}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------

function Sidebar({ company, role, initials }: { company: Company; role: string; initials: string }) {
  const nav = [
    { href: '/app/dashboard', label: 'Home',      icon: Home },
    { href: '/app/pipeline',  label: 'Pipeline',  icon: Inbox },
    { href: '/app/calendar',  label: 'Calendar',  icon: Calendar },
    { href: '/app/customers', label: 'Customers', icon: Users },
    { href: '/app/catalog',   label: 'Catalog',   icon: Package },
    { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/70 bg-sidebar px-3 py-4 lg:flex">
      <Link
        href="/app/dashboard"
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent"
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

      <nav className="mt-6 space-y-0.5">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <n.icon className="h-4 w-4" />
            <span className="flex-1 truncate">{n.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-0.5 pt-4">
        <Link
          href="/app/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
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

// -----------------------------------------------------------------------------

function TopBar({
  email,
  initials,
  menuOpen,
  setMenuOpen,
}: {
  email: string
  initials: string
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
}) {
  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background px-6 lg:px-10">
      <button className="group flex max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-border/80">
        <Search className="h-4 w-4" />
        <span className="flex-1">Search or ask AI…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <Link
          href="/app/quotes/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New quote
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-2 flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-muted"
          >
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-semibold">{initials}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {menuOpen && (
            <UserMenu email={email} onClose={() => setMenuOpen(false)} />
          )}
        </div>
      </div>
    </header>
  )
}

// -----------------------------------------------------------------------------

function UserMenu({ email, onClose }: { email: string; onClose: () => void }) {
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

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
        <Button
          onClick={signOut}
          disabled={signingOut}
          variant="ghost"
          className="w-full justify-start gap-2 px-2 py-1.5 text-sm font-normal"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------

function getInitials(profile: Record<string, unknown>, email: string): string {
  const first = String(profile.first_name ?? '').trim()
  const last = String(profile.last_name ?? '').trim()
  const combined = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
  if (combined) return combined
  return (email[0] ?? 'U').toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _cn = cn
