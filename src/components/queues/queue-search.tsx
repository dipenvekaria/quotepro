'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueueSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Search bar component for filtering queue items
 * Shows search icon, input field, and clear button when text is entered
 */
export function QueueSearch({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className 
}: QueueSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-10 py-2.5 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "text-gray-900 dark:text-white",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent",
          "transition-colors"
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>
      )}
    </div>
  )
}
