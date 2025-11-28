'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  FileText, 
  Calendar, 
  ClipboardCheck, 
  DollarSign, 
  CheckCircle2, 
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavSection {
  label: string
  icon: React.ComponentType<{ className?: string }>
  defaultExpanded?: boolean
  children: NavLink[]
}

interface NavLink {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

interface DesktopSidebarProps {
  counts?: {
    leads: number
    quotes: number
    toBeScheduled: number
    scheduled: number
    invoice: number
    paid: number
  }
}

export function DesktopSidebar({ counts = {
  leads: 0,
  quotes: 0,
  toBeScheduled: 0,
  scheduled: 0,
  invoice: 0,
  paid: 0
} }: DesktopSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'leads-quotes': true,
    'work': true,
    'pay': true
  })
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded-sections')
    if (saved) {
      try {
        setExpandedSections(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse sidebar state:', e)
      }
    }
    
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === 'true')
    }
  }, [])

  // Save expanded state to localStorage
  const toggleSection = (sectionKey: string) => {
    const newState = {
      ...expandedSections,
      [sectionKey]: !expandedSections[sectionKey]
    }
    setExpandedSections(newState)
    localStorage.setItem('sidebar-expanded-sections', JSON.stringify(newState))
  }

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const sections: (NavSection | NavLink)[] = [
    {
      label: 'Leads & Quotes',
      icon: Users,
      defaultExpanded: true,
      children: [
        {
          label: 'Leads',
          href: '/leads-and-quotes/leads',
          icon: Users,
          count: counts.leads
        },
        {
          label: 'Quotes',
          href: '/leads-and-quotes/quotes',
          icon: FileText,
          count: counts.quotes
        }
      ]
    },
    {
      label: 'Work',
      icon: Calendar,
      defaultExpanded: true,
      children: [
        {
          label: 'Pending',
          href: '/work/to-be-scheduled',
          icon: Calendar,
          count: counts.toBeScheduled
        },
        {
          label: 'Scheduled',
          href: '/work/scheduled',
          icon: ClipboardCheck,
          count: counts.scheduled
        }
      ]
    },
    {
      label: 'Pay',
      icon: DollarSign,
      defaultExpanded: true,
      children: [
        {
          label: 'Invoice',
          href: '/pay/invoice',
          icon: DollarSign,
          count: counts.invoice
        },
        {
          label: 'Paid',
          href: '/pay/paid',
          icon: CheckCircle2,
          count: counts.paid
        }
      ]
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings
    }
  ]

  const isActive = (href: string) => {
    return pathname?.startsWith(href)
  }

  const renderNavLink = (link: NavLink) => (
    <Link
      key={link.href}
      href={link.href}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all group",
        isActive(link.href)
          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100",
        isCollapsed && "justify-center px-2"
      )}
      title={isCollapsed ? link.label : undefined}
    >
      <div className={cn("flex items-center gap-3", isCollapsed && "gap-0")}>
        <link.icon className={cn(
          "w-4 h-4 transition-colors",
          isActive(link.href) ? "text-orange-600 dark:text-orange-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        )} />
        {!isCollapsed && (
          <span className={cn(
            "text-sm font-medium",
            isActive(link.href) ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"
          )}>
            {link.label}
          </span>
        )}
      </div>
      {!isCollapsed && link.count !== undefined && link.count > 0 && (
        <span className={cn(
          "px-2.5 py-1 text-xs font-bold rounded-full min-w-[24px] text-center",
          isActive(link.href)
            ? "bg-orange-500 dark:bg-orange-600 text-white"
            : "bg-gray-700 dark:bg-gray-600 text-white"
        )}>
          {link.count}
        </span>
      )}
    </Link>
  )

  const renderSection = (section: NavSection, sectionKey: string) => {
    const isExpanded = expandedSections[sectionKey] ?? section.defaultExpanded ?? true
    const SectionIcon = section.icon
    const hasActiveChild = section.children.some(child => isActive(child.href))

    if (isCollapsed) {
      // In collapsed mode, just show icons for children
      return (
        <div key={sectionKey} className="space-y-1">
          {section.children.map(child => renderNavLink(child))}
        </div>
      )
    }

    return (
      <div key={sectionKey} className="space-y-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all group",
            hasActiveChild 
              ? "bg-orange-50/50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          )}
        >
          <div className="flex items-center gap-3">
            <SectionIcon className={cn(
              "w-4 h-4 transition-colors",
              hasActiveChild ? "text-orange-600 dark:text-orange-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            )} />
            <span className={cn(
              "text-sm font-semibold",
              hasActiveChild ? "text-orange-600 dark:text-orange-400" : "text-gray-700 dark:text-gray-300"
            )}>
              {section.label}
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="ml-4 space-y-1 pl-3 border-l border-gray-200 dark:border-gray-700">
            {section.children.map(child => renderNavLink(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={cn(
      "hidden md:flex md:flex-col fixed inset-y-0 z-50 !bg-white dark:!bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700 !bg-white dark:!bg-gray-800 justify-between">
        {!isCollapsed && (
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">QuotePro</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/home">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto cursor-pointer">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 !bg-white dark:!bg-gray-800">
        {sections.map((item) => {
          if ('children' in item) {
            const sectionKey = item.label.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')
            return renderSection(item, sectionKey)
          } else {
            return renderNavLink(item)
          }
        })}
      </nav>

      {/* Spacer to push user section to bottom */}
      <div className="flex-shrink-0"></div>

      {/* User info & Collapse Button - at the absolute bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700 !bg-white dark:!bg-gray-800">
        {!isCollapsed ? (
          <div className="p-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">User</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Contractor</p>
              </div>
              <button
                onClick={toggleCollapse}
                className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">U</span>
            </div>
            <button
              onClick={toggleCollapse}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
