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
    href: '/leads-and-quotes/leads',
    icon: Target,
    description: 'Manage leads and quotes'
  },
  {
    name: 'Calendar',
    href: '/work',
    icon: Calendar,
    description: 'Schedule and track jobs'
  },
  {
    name: 'More',
    href: '/settings',
    icon: Settings,
    description: 'Settings and options'
  },
]

export function DashboardNavigation({ companyId }: { companyId: string }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    if (href === '/leads-and-quotes/leads') {
      return pathname === '/leads-and-quotes/leads' || pathname === '/leads-and-quotes/quotes' || pathname === '/leads' || pathname === '/prospects'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-gray-200 lg:bg-white">
        {/* Logo/Brand - Clickable to go home */}
        <Link href="/home" className="flex h-16 items-center justify-center px-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <img 
            src="/thefieldgenie.png" 
            alt="The Field Genie" 
            className="h-14 w-auto object-contain max-w-full"
          />
        </Link>

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
                    ? 'bg-[#2563eb] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                  {!active && (
                    <span className="text-xs text-gray-500">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section - Field Genie branding */}
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-center text-muted-foreground">
            Field Genie • Win more jobs
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation - Modern Frosted Glass Design */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        {/* Fully opaque backdrop */}
        <div className="absolute inset-0 bg-white border-t border-gray-200" />
        
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50/20 to-transparent pointer-events-none" />
        
        <div className="relative flex items-center justify-around w-full px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 py-2 px-3 transition-all relative flex-1 group"
              >
                {/* Active indicator - liquid morphing blob */}
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-blue-600/5 rounded-2xl scale-95 transition-transform" />
                )}
                
                {/* Icon container with smooth scaling */}
                <div className={cn(
                  'relative rounded-xl p-2 transition-all duration-300',
                  active 
                    ? 'bg-gradient-to-br from-slate-900 to-blue-600 shadow-lg shadow-blue-500/30 scale-105' 
                    : 'bg-gray-100/50 group-hover:bg-gray-200/70 group-hover:scale-105'
                )}>
                  <Icon className={cn(
                    'h-6 w-6 flex-shrink-0 transition-all duration-300',
                    active ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'
                  )} />
                </div>
                
                {/* Label with smooth fade */}
                <span className={cn(
                  'text-[10px] font-bold tracking-wide truncate max-w-full text-center leading-tight transition-all duration-300',
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 group-hover:text-gray-700'
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
