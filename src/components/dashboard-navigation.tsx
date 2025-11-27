'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, Calendar, BarChart3, DollarSign, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Target,
    description: 'Manage leads and quotes'
  },
  {
    name: 'Work',
    href: '/work',
    icon: Calendar,
    description: 'Schedule and track jobs'
  },
  {
    name: 'Pay',
    href: '/payments',
    icon: DollarSign,
    description: 'Track and collect payments'
  },
  {
    name: 'Stats',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance insights'
  },
  {
    name: 'More',
    href: '/settings',
    icon: Settings,
    description: 'Company and team settings'
  },
]

export function DashboardNavigation({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    if (href === '/leads') {
      return pathname === '/leads' || pathname === '/prospects'
    }
    return pathname?.startsWith(href)
  }

  // Show FAB only on Leads page
  const showFAB = pathname === '/leads' || pathname === '/prospects'

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-gray-200 dark:lg:border-gray-800 lg:bg-white dark:lg:bg-gray-950">
        {/* Logo/Brand */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="bg-[#FF6200] p-2 rounded-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">QuotePro</h1>
            <p className="text-xs text-muted-foreground">Win more jobs</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#FF6200] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {!active && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section - QuotePro branding */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <p className="text-xs text-center text-muted-foreground">
            QuotePro • Win more jobs
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 pb-safe">
        <div className="flex items-center justify-around w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-1 transition-all relative flex-1',
                  active && 'text-[#FF6200]'
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-[#FF6200] rounded-b-full" />
                )}
                <Icon className={cn(
                  'h-[13px] w-[13px] flex-shrink-0 transition-all',
                  active ? 'scale-105' : 'text-gray-500 dark:text-gray-400'
                )} />
                <span className={cn(
                  'text-[7px] font-medium mt-0.5 truncate max-w-full text-center leading-tight',
                  active ? 'text-[#FF6200]' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Floating Action Button - New Lead (only on Leads page) */}
      {showFAB && (
        <Link
          href="/leads?new_lead=true"
          className="lg:hidden fixed bottom-20 right-4 z-50"
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-[#FF6200] hover:bg-[#E55800] active:scale-95 transition-all"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      )}
    </>
  )
}
