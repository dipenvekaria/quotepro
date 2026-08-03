'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Command,
  Copy,
  FileText,
  Home,
  Inbox,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

// -----------------------------------------------------------------------------
// Mock data
// -----------------------------------------------------------------------------

const stats = [
  { label: 'Quotes sent', value: '128', change: '+18%', trend: 'up' as const, color: 'primary' },
  { label: 'Win rate', value: '47%', change: '+4.2 pts', trend: 'up' as const, color: 'emerald' },
  { label: 'Avg quote size', value: '$3,240', change: '+$180', trend: 'up' as const, color: 'violet' },
  { label: 'Outstanding', value: '$12,480', change: '3 invoices', trend: 'flat' as const, color: 'amber' },
]

const pipeline = {
  Leads: [
    { id: 'L-042', customer: 'Sarah Johnson', title: 'AC replacement estimate', hours: 2, value: null, avatar: 'SJ' },
    { id: 'L-041', customer: 'Michael Brown', title: 'Furnace not heating', hours: 5, value: null, avatar: 'MB' },
    { id: 'L-040', customer: 'Emily Rodriguez', title: 'Kitchen faucet leak', hours: 8, value: null, avatar: 'ER' },
  ],
  Quotes: [
    { id: 'Q-1042', customer: 'David Chen', title: 'Water heater — Rinnai tankless', hours: 1, value: 5100, avatar: 'DC' },
    { id: 'Q-1041', customer: 'Jennifer Wilson', title: 'Duct cleaning + UV', hours: 12, value: 1450, avatar: 'JW' },
    { id: 'Q-1040', customer: 'James Martinez', title: '50-gal water heater install', hours: 24, value: 1450, avatar: 'JM' },
  ],
  Jobs: [
    { id: 'J-089', customer: 'Linda Anderson', title: 'Furnace + smart thermostat', hours: -1, value: 3000, avatar: 'LA' },
    { id: 'J-088', customer: 'Patricia Thomas', title: 'Aeroseal duct sealing', hours: 22, value: 1850, avatar: 'PT' },
  ],
  Invoices: [
    { id: 'INV-1008', customer: 'William Taylor', title: 'Faucet replacement', hours: 48, value: 425, avatar: 'WT' },
    { id: 'INV-1006', customer: 'Robert Davis', title: 'AC tune-up + recharge', hours: 72, value: 535, avatar: 'RD' },
  ],
}

const activity = [
  { icon: CheckCircle2, iconColor: 'text-emerald-500', text: <><b>David Chen</b> accepted Q-1042 · $5,100</>, at: '3m ago' },
  { icon: Send, iconColor: 'text-primary', text: <><b>Jennifer Wilson</b> received Q-1041 · Duct cleaning</>, at: '18m ago' },
  { icon: Bot, iconColor: 'text-violet-500', text: <>QuoteBuilder generated Q-1042 in <b>2.4s</b> · 4 items grounded</>, at: '18m ago' },
  { icon: CheckCircle2, iconColor: 'text-emerald-500', text: <><b>Patricia Thomas</b> paid INV-1005 · $1,850</>, at: '2h ago' },
  { icon: Bell, iconColor: 'text-amber-500', text: <>SMS follow-up sent to <b>Emily Rodriguez</b></>, at: '4h ago' },
]

// -----------------------------------------------------------------------------
// Layout
// -----------------------------------------------------------------------------

export default function PreviewPage() {
  const [active, setActive] = useState('Home')

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* ─────────── Sidebar ─────────── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/70 bg-sidebar px-3 py-4 lg:flex">
        <WorkspaceSwitcher />

        <div className="mt-6 space-y-0.5">
          {[
            { icon: Home, label: 'Home' },
            { icon: Inbox, label: 'Pipeline', badge: 12 },
            { icon: Calendar, label: 'Calendar' },
            { icon: Users, label: 'Customers' },
            { icon: Package, label: 'Catalog' },
            { icon: BarChart3, label: 'Analytics' },
          ].map((n) => (
            <NavItem
              key={n.label}
              icon={n.icon}
              label={n.label}
              badge={n.badge}
              active={active === n.label}
              onClick={() => setActive(n.label)}
            />
          ))}
        </div>

        <div className="mt-6 px-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Favorites
          </p>
          <div className="space-y-0.5">
            <NavItem icon={FileText} label="Q3 sales report" muted />
            <NavItem icon={FileText} label="Winter promos" muted />
          </div>
        </div>

        <div className="mt-auto space-y-0.5 pt-4">
          <NavItem icon={Settings} label="Settings" />
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-semibold">AO</span>
            </div>
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium">Alex Owner</div>
              <div className="truncate text-xs text-muted-foreground">Acme HVAC</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* ─────────── Main ─────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10 lg:py-8">
            <PageHeader />

            {/* Stats grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>

            {/* Two-column layout */}
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
              <PipelineBoard />
              <div className="space-y-8">
                <AiCard />
                <ActivityFeed />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Sidebar bits
// -----------------------------------------------------------------------------

function WorkspaceSwitcher() {
  return (
    <button className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-sidebar-accent">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 truncate">
        <div className="truncate text-sm font-semibold">QuotePro</div>
        <div className="truncate text-[11px] text-muted-foreground">Acme HVAC & Plumbing</div>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  muted,
  onClick,
}: {
  icon: typeof Home
  label: string
  badge?: number | string
  active?: boolean
  muted?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : muted
            ? 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4', active && 'text-primary')} strokeWidth={active ? 2.4 : 2} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// -----------------------------------------------------------------------------
// Top bar
// -----------------------------------------------------------------------------

function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background px-6 lg:px-10">
      <button className="group flex flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-border/80">
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
        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
          <Plus className="h-4 w-4" />
          New quote
        </button>
      </div>
    </header>
  )
}

// -----------------------------------------------------------------------------
// Page header
// -----------------------------------------------------------------------------

function PageHeader() {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="#" className="hover:text-foreground">Workspace</Link>
          <span>/</span>
          <span className="text-foreground">Home</span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Good afternoon, Alex
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening in your workspace today.
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5 shadow-sm">
          {['Today', 'Week', 'Month'].map((t, i) => (
            <button
              key={t}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium',
                i === 1 ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Stat card
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  change,
  trend,
  color,
}: {
  label: string
  value: string
  change: string
  trend: 'up' | 'flat'
  color: string
}) {
  const dot: Record<string, string> = {
    primary: 'bg-primary',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-500',
  }
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', dot[color])} />
          {label}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
        <span className={trend === 'up' ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
          {change}
        </span>
        <span className="text-muted-foreground">vs last week</span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Pipeline board
// -----------------------------------------------------------------------------

function PipelineBoard() {
  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Pipeline</h2>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
            {Object.values(pipeline).flat().length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            Filter
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        {(Object.keys(pipeline) as (keyof typeof pipeline)[]).map((col) => (
          <div key={col} className="min-w-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={cn('h-1.5 w-1.5 rounded-full', columnDot(col))} />
                {col}
              </div>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                {pipeline[col].length}
              </span>
            </div>
            <div className="space-y-2">
              {pipeline[col].map((item) => (
                <PipelineCard key={item.id} {...item} />
              ))}
              <button className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function columnDot(col: string) {
  switch (col) {
    case 'Leads':    return 'bg-primary'
    case 'Quotes':   return 'bg-violet-500'
    case 'Jobs':     return 'bg-amber-500'
    case 'Invoices': return 'bg-emerald-500'
    default:         return 'bg-muted-foreground'
  }
}

function PipelineCard({
  id, customer, title, hours, value, avatar,
}: {
  id: string
  customer: string
  title: string
  hours: number
  value: number | null
  avatar: string
}) {
  return (
    <div className="group cursor-pointer rounded-lg border border-border/70 bg-background p-3 shadow-sm transition-all hover:border-border hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
          {id}
        </span>
        {value && (
          <span className="text-xs font-semibold tabular">
            ${value.toLocaleString()}
          </span>
        )}
      </div>
      <div className="mt-2 text-sm font-medium leading-snug">{title}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {avatar}
          </div>
          <span className="truncate text-xs text-muted-foreground">{customer}</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {hours < 0 ? 'now' : hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`}
        </span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// AI card
// -----------------------------------------------------------------------------

function AiCard() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 shadow-sm">
      <div className="absolute inset-0 bg-dots opacity-30" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Ask QuoteBuilder</div>
            <div className="text-xs text-muted-foreground">gemini-2.0-flash · grounded on catalog</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground/85">
          "Generate a quote for a{' '}
          <span className="rounded bg-primary/10 px-1 font-medium text-primary">3-ton AC replacement</span>{' '}
          with 6 hours of labor, permits, and a smart thermostat upsell."
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90">
            <Zap className="h-3 w-3" />
            Generate — 2s
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
            <Copy className="h-3 w-3" />
            Templates
          </button>
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// Activity feed
// -----------------------------------------------------------------------------

function ActivityFeed() {
  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
        <h2 className="text-base font-semibold">Activity</h2>
        <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </header>
      <ul className="divide-y divide-border/70">
        {activity.map((a, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-3.5">
            <a.icon className={cn('mt-0.5 h-4 w-4 shrink-0', a.iconColor)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-foreground/85">{a.text as ReactNode}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{a.at}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
