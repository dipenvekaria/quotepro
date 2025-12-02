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
    <div className={cn("md:hidden sticky top-0 z-40 bg-white border-b border-gray-200", className)}>
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
                  ? "text-blue-600"
                  : "text-gray-600 active:bg-gray-50"
              )}
            >
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
