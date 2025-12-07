'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TabItem {
  label: string
  href: string
  count?: number
}

interface MobileSectionTabsProps {
  tabs?: TabItem[]
  // Alternative props for leads/quotes pages
  activeTab?: 'leads' | 'quotes'
  leadsCount?: number
  quotesCount?: number
  className?: string
}

export function MobileSectionTabs({ 
  tabs: propTabs, 
  activeTab,
  leadsCount,
  quotesCount,
  className 
}: MobileSectionTabsProps) {
  const pathname = usePathname()

  // Build tabs from either format
  const tabs = propTabs || [
    { label: 'Leads', href: '/leads-and-quotes/leads', count: leadsCount },
    { label: 'Quotes', href: '/leads-and-quotes/quotes', count: quotesCount },
  ]

  return (
    <div className={cn("md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm", className)}>
      <div className="flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab 
            ? (activeTab === 'leads' && tab.href.includes('leads')) || (activeTab === 'quotes' && tab.href.includes('quotes'))
            : pathname === tab.href || pathname?.startsWith(tab.href + '/')
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex items-center justify-center gap-2.5 py-4 px-4 text-base font-semibold transition-all relative",
                isActive
                  ? "text-blue-600 bg-blue-50/50"
                  : "text-gray-600 active:bg-gray-50 hover:bg-gray-50"
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-sm font-bold px-2 py-1 rounded-full min-w-[24px] text-center",
                  isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                )}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
