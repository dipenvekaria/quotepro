'use client'

import { MobileBottomNav } from './mobile-bottom-nav'
import { DesktopSidebar } from './desktop-sidebar'
import { FloatingActionMenu } from '../floating-action-menu'
import { useDashboard } from '@/lib/dashboard-context'
import { useMemo, useState, useEffect } from 'react'

interface NavigationWrapperProps {
  children: React.ReactNode
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const { quotes } = useDashboard()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync with sidebar collapse state
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    // Listen for changes
    const handleStorage = () => {
      const collapsed = localStorage.getItem('sidebar-collapsed')
      setIsCollapsed(collapsed === 'true')
    }

    window.addEventListener('storage', handleStorage)
    // Also check periodically for same-window updates
    const interval = setInterval(handleStorage, 100)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // Calculate counts for each queue
  const counts = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return {
        leads: 0,
        quotes: 0,
        toBeScheduled: 0,
        scheduled: 0,
        invoice: 0,
        paid: 0
      }
    }

    return {
      // Leads: new customer calls, not yet quoted
      leads: quotes.filter(q => 
        !q.lead_status || q.lead_status === 'new' || q.lead_status === 'contacted'
      ).length,

      // Quotes: drafted or sent, not accepted yet
      quotes: quotes.filter(q => 
        q.lead_status === 'quoted' && 
        !q.accepted_at && 
        !q.signed_at
      ).length,

      // To be Scheduled: accepted/signed but not scheduled
      toBeScheduled: quotes.filter(q => 
        (q.accepted_at || q.signed_at) && 
        !q.scheduled_at &&
        !q.completed_at
      ).length,

      // Scheduled: scheduled but not completed
      scheduled: quotes.filter(q => 
        q.scheduled_at && 
        !q.completed_at
      ).length,

      // Invoice: completed but not paid
      invoice: quotes.filter(q => 
        q.completed_at && 
        !q.paid_at
      ).length,

      // Paid: all paid jobs
      paid: quotes.filter(q => 
        q.paid_at
      ).length
    }
  }, [quotes])

  return (
    <>
      {/* Desktop Sidebar */}
      <DesktopSidebar counts={counts} />

      {/* Main Content Area */}
      <div className={isCollapsed ? "md:pl-16 pb-16 md:pb-0" : "md:pl-64 pb-16 md:pb-0"}>
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Action Menu */}
      <FloatingActionMenu />
    </>
  )
}
