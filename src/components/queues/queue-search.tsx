'use client'

import { Search, X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface QueueSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  showFilters?: boolean
  onFilterClick?: () => void
  hasActiveFilters?: boolean
}

/**
 * Search bar component for filtering queue items
 * Shows search icon, input field, optional filter button, and clear button
 */
export function QueueSearch({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className,
  showFilters = false,
  onFilterClick,
  hasActiveFilters = false
}: QueueSearchProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-10 py-2.5 rounded-xl",
            "bg-white",
            "border border-gray-200",
            "text-gray-900",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent",
            "transition-colors"
          )}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      
      {showFilters && (
        <button
          onClick={onFilterClick}
          className={cn(
            "flex-shrink-0 p-2.5 rounded-xl border transition-all",
            hasActiveFilters 
              ? "bg-[#2563eb] text-white border-[#2563eb]" 
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          )}
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
