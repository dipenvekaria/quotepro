'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Target, Calendar, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  matchPaths: string[]
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
    matchPaths: ['/leads-and-quotes', '/leads', '/quotes']
  },
  {
    label: 'Calendar',
    href: '/work',
    icon: Calendar,
    matchPaths: ['/work', '/calendar']
  },
  {
    label: 'More',
    href: '/settings',
    icon: Settings,
    matchPaths: ['/settings', '/analytics', '/pay']
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()

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
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all flex-1",
                  active 
                    ? "bg-blue-50" 
                    : "active:bg-gray-100"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all",
                  active ? "bg-blue-600" : "bg-gray-100"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-white" : "text-gray-600"
                  )} />
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
