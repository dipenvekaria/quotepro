'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Target, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  matchPaths: string[]
  countKey?: 'work' | 'leads' | 'quotes'
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/home',
    icon: Home,
    matchPaths: ['/home', '/']
  },
  {
    label: 'Leads',
    href: '/leads-and-quotes/leads',
    icon: Target,
    matchPaths: ['/leads-and-quotes', '/leads', '/quotes'],
    countKey: 'leads'
  },
  {
    label: 'Calendar',
    href: '/work',
    icon: Calendar,
    matchPaths: ['/work', '/calendar'],
    countKey: 'work'
  },
  {
    label: 'Config',
    href: '/settings',
    icon: Settings,
    matchPaths: ['/settings', '/analytics', '/pay']
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { counts } = useDashboard()

  const isActive = (item: NavItem) => {
    // Special case for home - only match exact paths
    if (item.label === 'Home') {
      return pathname === '/home' || pathname === '/'
    }
    // For other items, check if pathname starts with any match path
    return item.matchPaths.some(path => pathname?.startsWith(path))
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe backdrop-blur-lg bg-opacity-95">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            const count = item.countKey ? counts[item.countKey] : 0
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all flex-1 relative",
                  active 
                    ? "bg-blue-50" 
                    : "active:bg-gray-100"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all relative",
                  active ? "bg-blue-600" : "bg-gray-100"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-white" : "text-gray-600"
                  )} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold transition-colors leading-tight text-center",
                  active ? "text-blue-600" : "text-gray-600"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
