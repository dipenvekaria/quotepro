'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface QueueHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

/**
 * Standard header for queue pages
 * Shows title, optional subtitle, and action button
 * Consistent spacing and typography across all queue pages
 */
export function QueueHeader({ 
  title, 
  subtitle,
  action,
  className 
}: QueueHeaderProps) {
  return (
    <header className={cn(
      "bg-white border-b border-gray-200 sticky top-0 z-10",
      "px-4 md:px-6 py-4",
      className
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-base text-gray-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  )
}
