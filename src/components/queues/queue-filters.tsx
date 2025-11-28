'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

export interface FilterOption {
  label: string
  value: string
  count?: number
}

interface QueueFiltersProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Dropdown filter component for queue pages
 * Shows selected option with count badge and dropdown menu
 */
export function QueueFilters({ 
  label, 
  options, 
  value, 
  onChange,
  className 
}: QueueFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "text-sm font-medium text-gray-700 dark:text-gray-300",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600"
        )}
      >
        <span className="text-gray-500 dark:text-gray-400">{label}:</span>
        <span className="text-gray-900 dark:text-white">{selectedOption.label}</span>
        {selectedOption.count !== undefined && (
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {selectedOption.count}
          </span>
        )}
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute z-50 mt-2 w-full min-w-[200px] rounded-lg shadow-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "py-1"
        )}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5",
                "text-sm text-left",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                "transition-colors",
                option.value === value && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
              )}
            >
              <span className={cn(
                option.value === value ? "font-semibold" : "font-medium"
              )}>
                {option.label}
              </span>
              {option.count !== undefined && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-bold rounded-full",
                  option.value === value 
                    ? "bg-orange-500 dark:bg-orange-600 text-white" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                )}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
