'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  matchPaths: string[]
}

const navItems: NavItem[] = [
  {
    label: 'Leads',
    href: '/leads-and-quotes/leads',
    icon: Users,
    matchPaths: ['/leads-and-quotes', '/leads', '/quotes']
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    matchPaths: ['/calendar']
  },
  {
    label: 'Work',
    href: '/work',
    icon: LayoutDashboard,
    matchPaths: ['/work']
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    return item.matchPaths.some(path => pathname?.startsWith(path))
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom backdrop-blur-lg bg-opacity-95">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-lg transition-all min-w-[50px] flex-1 max-w-[70px]",
                active 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                active ? "text-blue-600" : "text-gray-500"
              )} />
              <span className={cn(
                "text-[10px] font-medium transition-colors leading-tight text-center",
                active ? "text-blue-600" : "text-gray-600"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
