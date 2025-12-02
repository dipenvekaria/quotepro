'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserRole } from '@/hooks/use-user-role'
import { hasPermission } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Home, FileText, Settings, LogOut, Menu, X, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export function DashboardNav({ buttonOnly = false }: { buttonOnly?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { role, loading } = useUserRole()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Base nav items (everyone can see these)
  const baseNavItems = [
    { icon: FileText, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'New Quote', href: '/quotes/new' },
  ]

  // Admin-only items
  const adminNavItems = [
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  // Combine nav items based on role
  // Show settings link optimistically if still loading
  const navItems = [
    ...baseNavItems,
    ...(loading || hasPermission(role, 'VIEW_SETTINGS') ? adminNavItems : [])
  ]

  const isActive = (href: string) => pathname === href

  // If buttonOnly mode, just render the menu button and mobile sidebar
  if (buttonOnly) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white hover:bg-white/10 lg:hidden"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Overlay for mobile */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`
            fixed top-0 left-0 h-full bg-[#0F172A] border-r border-white/10 z-[101]
            transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            w-64 lg:hidden
          `}
        >
          <div className="flex flex-col h-full">
            {/* Close button on mobile */}
            <div className="flex items-center justify-between p-4">
              <span className="text-white font-bold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      className={`
                        w-full justify-start h-12 text-sm
                        ${active 
                          ? 'bg-[#2563eb] hover:bg-[#2563eb]/90 text-white' 
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            {/* Sign Out at bottom */}
            <div className="p-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start h-12 text-sm text-white/70 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Full mode: render desktop sidebar + mobile button
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-[#0F172A] border-r border-white/10 z-[101]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-0
          w-64
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile header with close button */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="text-white font-bold">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop header spacing */}
          <div className="hidden lg:block h-4"></div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant={active ? 'secondary' : 'ghost'}
                    className={`
                      w-full justify-start h-12 text-sm
                      ${active 
                        ? 'bg-[#2563eb] hover:bg-[#2563eb]/90 text-white' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Sign Out at bottom */}
          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start h-12 text-sm text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
