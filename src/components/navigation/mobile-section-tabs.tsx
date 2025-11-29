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
  tabs: TabItem[]
  className?: string
}

export function MobileSectionTabs({ tabs, className }: MobileSectionTabsProps) {
  const pathname = usePathname()

  return (
    <div className={cn("md:hidden sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700", className)}>
      <div className="flex items-center">
        {tabs.map((tab, index) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all relative",
                isActive
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-600 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800"
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  isActive
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 dark:bg-orange-400" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
