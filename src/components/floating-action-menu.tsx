'use client'

import { useState } from 'react'
import { Plus, UserPlus, Calendar, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface FloatingActionMenuProps {
  onNewLead?: () => void
  onScheduleVisit?: () => void
  onNewQuote?: () => void
}

export function FloatingActionMenu({ 
  onNewLead, 
  onScheduleVisit, 
  onNewQuote 
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleNewLead = () => {
    setIsOpen(false)
    if (onNewLead) {
      onNewLead()
    } else {
      // Default: navigate to new lead page
      router.push('/leads/new')
    }
  }

  const handleScheduleVisit = () => {
    setIsOpen(false)
    if (onScheduleVisit) {
      onScheduleVisit()
    } else {
      // Default: navigate to calendar
      router.push('/work/to-be-scheduled?action=schedule')
    }
  }

  const handleNewQuote = () => {
    setIsOpen(false)
    if (onNewQuote) {
      onNewQuote()
    } else {
      // Default: navigate to new quote page
      router.push('/quotes/new')
    }
  }

  const menuItems = [
    {
      label: 'New Lead',
      icon: UserPlus,
      onClick: handleNewLead,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'Schedule',
      icon: Calendar,
      onClick: handleScheduleVisit,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: 'Quote',
      icon: FileText,
      onClick: handleNewQuote,
      color: 'bg-green-500 hover:bg-green-600'
    }
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Container - Mobile Only */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        {/* Menu Items */}
        <div className={cn(
          "absolute bottom-16 right-0 space-y-3 transition-all duration-300 ease-out",
          isOpen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-3 transition-all duration-300",
                  isOpen 
                    ? "opacity-100 translate-x-0" 
                    : "opacity-0 translate-x-4"
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                }}
              >
                <span className="bg-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 whitespace-nowrap min-w-[90px] text-center">
                  {item.label}
                </span>
                <button
                  onClick={item.onClick}
                  className={cn(
                    "w-12 h-12 rounded-full text-white shadow-lg transition-all hover:scale-110 flex items-center justify-center",
                    item.color
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full bg-gradient-to-br from-slate-900 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl flex items-center justify-center",
            isOpen && "rotate-45"
          )}
          aria-label={isOpen ? "Close menu" : "Open actions menu"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  )
}
