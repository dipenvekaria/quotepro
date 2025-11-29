'use client'

import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

export interface FilterOption {
  label: string
  value: string
  count?: number
}

interface MobileFilterButtonProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Compact filter button for mobile layouts
 * Icon-only design that opens a dropdown menu
 */
export function MobileFilterButton({ 
  label, 
  options, 
  value, 
  onChange,
  className 
}: MobileFilterButtonProps) {
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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center p-2.5 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "text-gray-700 dark:text-gray-300",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600",
          isOpen && "bg-gray-50 dark:bg-gray-700"
        )}
        aria-label={`Filter by ${label}`}
      >
        <Filter className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute z-50 right-0 mt-2 w-48 rounded-lg shadow-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "py-1",
          "animate-in fade-in slide-in-from-top-2 duration-200"
        )}>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
            {label}
          </div>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm",
                "flex items-center justify-between gap-2",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                "transition-colors",
                option.value === value && "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium"
              )}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-bold rounded-full",
                  option.value === value
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
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
