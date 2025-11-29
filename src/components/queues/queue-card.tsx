'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MapPin, DollarSign, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'

/**
 * Format address to show street and city only
 * Example: "123 Main Street, San Francisco, CA 94102" -> "123 Main St, San Francisco"
 */
function formatShortAddress(address: string): string {
  if (!address) return ''
  
  // Split by comma and take first two parts (street address + city)
  const parts = address.split(',').map(p => p.trim())
  const streetPart = parts[0] || ''
  const cityPart = parts[1] || ''
  
  // Abbreviate common street types in the street part
  const shortStreet = streetPart
    .replace(/\bStreet\b/gi, 'St')
    .replace(/\bAvenue\b/gi, 'Ave')
    .replace(/\bBoulevard\b/gi, 'Blvd')
    .replace(/\bRoad\b/gi, 'Rd')
    .replace(/\bDrive\b/gi, 'Dr')
    .replace(/\bLane\b/gi, 'Ln')
    .replace(/\bCourt\b/gi, 'Ct')
    .replace(/\bCircle\b/gi, 'Cir')
    .replace(/\bPlace\b/gi, 'Pl')
  
  return cityPart ? `${shortStreet}, ${cityPart}` : shortStreet
}

export interface QueueCardData {
  id: string
  customer_name: string
  customer_address?: string
  job_name?: string
  total?: number
  created_at?: string
  scheduled_at?: string
  completed_at?: string
  paid_at?: string
  status?: string
  lead_status?: string
}

interface QueueCardProps {
  data: QueueCardData
  badge?: ReactNode
  actions?: ReactNode
  onClick?: () => void
  className?: string
  showAmount?: boolean
  showDate?: boolean
  dateLabel?: string
}

/**
 * Generic card component for displaying queue items
 * Shows customer info, address, amount, dates, and custom actions
 */
export function QueueCard({
  data,
  badge,
  actions,
  onClick,
  className,
  showAmount = true,
  showDate = true,
  dateLabel = 'Created'
}: QueueCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const displayDate = data?.scheduled_at || data?.completed_at || data?.paid_at || data?.created_at

  return (
    <Card 
      className={cn(
        "transition-shadow",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 space-y-1.5">
            {/* Customer Name & Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                {data.customer_name}
              </h3>
              {badge}
            </div>

            {/* Job Name */}
            {data.job_name && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {data.job_name}
              </p>
            )}

            {/* Address */}
            {data.customer_address && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatShortAddress(data.customer_address)}</span>
              </div>
            )}

            {/* Details Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Amount */}
              {showAmount && data.total !== undefined && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Date */}
              {showDate && displayDate && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">
                    {dateLabel}: {format(new Date(displayDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
