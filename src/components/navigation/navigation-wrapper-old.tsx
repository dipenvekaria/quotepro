'use client'

import { MobileBottomNav } from './mobile-bottom-nav'
import { DesktopSidebar } from './desktop-sidebar'
import { FloatingActionMenu } from '../floating-action-menu'
import { useDashboard } from '@/lib/dashboard-context'
import { useMemo, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface NavigationWrapperProps {
  children: React.ReactNode
}

export function NavigationWrapper({ children }: NavigationWrapperProps) {
  const { quotes } = useDashboard()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  
  // Hide FAB on quotes page (quotes created from leads workflow only)
  const showFab = !pathname?.includes('/leads-and-quotes/quotes')

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
      // Leads: items from leads table (pre-quote statuses) + quotes with 0 items
      // Exclude archived
      leads: quotes.filter(q => {
        if (q.status === 'archived' || q.archived_at) return false
        
        // From leads table - only pre-quote statuses
        if (q._type === 'lead' || !q._type) {
          return ['new', 'contacted', 'qualified'].includes(q.status)
        }
        
        // From quotes table - only if 0 items (still a lead)
        if (q._type === 'quote') {
          const itemCount = q.quote_items?.length || 0
          return itemCount === 0
        }
        
        return false
      }).length,

      // Quotes: quotes with 1+ items (exclude archived)
      quotes: quotes.filter(q => {
        if (q.status === 'archived' || q.archived_at) return false
        if (q._type !== 'quote') return false
        const itemCount = q.quote_items?.length || 0
        return itemCount > 0
      }).length,

      // To be Scheduled: accepted/signed quotes not yet scheduled
      toBeScheduled: quotes.filter(q => 
        q._type === 'quote' &&
        (q.accepted_at || q.signed_at || q.status === 'accepted' || q.status === 'signed') && 
        !q.scheduled_at &&
        !q.completed_at &&
        q.status !== 'archived'
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

      {/* Main Content Area - pb-20 for mobile nav height */}
      <div className={isCollapsed ? "md:pl-16 pb-20 md:pb-0" : "md:pl-64 pb-20 md:pb-0"}>
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Action Menu - hidden on quotes page */}
      {showFab && <FloatingActionMenu />}
    </>
  )
}
