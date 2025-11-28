'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { 
  Inbox, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  DollarSign,
  Users
} from 'lucide-react'

interface EmptyQueueProps {
  title?: string
  description?: string
  icon?: 'inbox' | 'check' | 'file' | 'calendar' | 'dollar' | 'users'
  action?: ReactNode
  className?: string
}

const icons = {
  inbox: Inbox,
  check: CheckCircle2,
  file: FileText,
  calendar: Calendar,
  dollar: DollarSign,
  users: Users
}

/**
 * Empty state component for queue pages
 * Shows friendly message when queue is empty
 */
export function EmptyQueue({
  title = "Nothing here yet",
  description = "Items will appear here when they match this queue's criteria.",
  icon = 'inbox',
  action,
  className
}: EmptyQueueProps) {
  const Icon = icons[icon]

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {description}
      </p>

      {/* Optional Action */}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
}
