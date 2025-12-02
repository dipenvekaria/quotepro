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
          "bg-white",
          "border border-gray-200",
          "text-sm font-bold text-gray-700",
          "hover:bg-gray-50",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
      >
        <span className="text-gray-500">{label}:</span>
        <span className="text-gray-900">{selectedOption.label}</span>
        {selectedOption.count !== undefined && (
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-200 text-gray-700">
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
          "bg-white",
          "border border-gray-200",
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
                "hover:bg-gray-50",
                "transition-colors",
                option.value === value && "bg-blue-50 text-blue-600"
              )}
            >
              <span className={cn(
                option.value === value ? "font-bold" : "font-bold"
              )}>
                {option.label}
              </span>
              {option.count !== undefined && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-bold rounded-full",
                  option.value === value 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 text-gray-700"
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
