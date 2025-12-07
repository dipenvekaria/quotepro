'use client'

import { MobileBottomNav } from './mobile-bottom-nav'
import { DesktopSidebar } from './desktop-sidebar'
import { useDashboard } from '@/lib/dashboard-context'
import { useState, useEffect } from 'react'

interface NavigationWrapperProps {
  children: React.ReactNode
}

/**
 * NAVIGATION WRAPPER
 * Uses unified counts from dashboard context
 * No more complex filtering logic - just use counts directly
 */
export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const { counts } = useDashboard()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync with sidebar collapse state
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    const handleStorage = () => {
      const collapsed = localStorage.getItem('sidebar-collapsed')
      setIsCollapsed(collapsed === 'true')
    }

    window.addEventListener('storage', handleStorage)
    const interval = setInterval(handleStorage, 100)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Navigation counts from unified work_items
  const navCounts = {
    leads: counts.leads,
    quotes: counts.quotes,
    toBeScheduled: counts.toSchedule,
    scheduled: counts.work,
    invoice: 0, // TODO: completed items
    paid: 0     // TODO: paid items
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <DesktopSidebar counts={navCounts} />

      {/* Main Content Area - pb-20 for mobile nav height */}
      <div className={isCollapsed ? "md:pl-16 pb-20 md:pb-0" : "md:pl-64 pb-20 md:pb-0"}>
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </>
  )
}
