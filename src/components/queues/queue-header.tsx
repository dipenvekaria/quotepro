'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface QueueHeaderProps {
  title: string
  description?: string
  count?: number
  action?: ReactNode
  className?: string
}

/**
 * Standard header for queue pages
 * Shows title, optional description, item count badge, and action button
 */
export function QueueHeader({ 
  title, 
  description, 
  count, 
  action,
  className 
}: QueueHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {count !== undefined && (
            <span className="px-3 py-1 text-sm font-bold rounded-full bg-orange-500 dark:bg-orange-600 text-white">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
