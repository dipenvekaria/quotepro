'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MapPin, DollarSign, Calendar, Phone } from 'lucide-react'
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

export interface CompactCardData {
  id: string
  customer_name: string
  customer_address?: string
  customer_phone?: string
  job_name?: string
  job_type?: string
  total?: number
  created_at?: string
  scheduled_at?: string
  completed_at?: string
  paid_at?: string
  status?: string
  lead_status?: string
  quote_number?: string
}

interface CompactQueueCardProps {
  data: CompactCardData
  badge?: ReactNode
  actions?: ReactNode
  onClick?: () => void
  onArchive?: (id: string) => void
  onArchiveClick?: (id: string) => void // Triggers dialog instead of direct archive
  className?: string
  showAmount?: boolean
  showPhone?: boolean
  hideAddress?: boolean
}

/**
 * Mobile-optimized compact card for queue items
 * Shows only essential info: name, badge, amount/phone
 * Hides address on mobile for cleaner look
 */
export function CompactQueueCard({
  data,
  badge,
  actions,
  onClick,
  onArchive,
  onArchiveClick,
  className,
  showAmount = true,
  showPhone = false,
  hideAddress = false,
}: CompactQueueCardProps) {
  // Guard against undefined data
  if (!data) {
    return null
  }
  
  const displayDate = data?.scheduled_at || data?.completed_at || data?.paid_at || data?.created_at

  return (
    <div className="relative overflow-hidden">
      {/* Card */}
      <Card 
        className={cn(
          "transition-all active:scale-[0.98] relative bg-white border border-gray-200 rounded-xl",
          onClick && "cursor-pointer active:bg-gray-50",
          className
        )}
        onClick={onClick}
      >
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Customer Name & Badge */}
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-gray-900 truncate">
                {data.customer_name}
              </h3>
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>

            {/* Job Name - Mobile Only */}
            {data.job_name && (
              <p className="text-sm text-gray-600 truncate">
                {data.job_name}
              </p>
            )}

            {/* Job Type - Mobile Only (if no job_name) */}
            {!data.job_name && data.job_type && (
              <p className="text-sm text-gray-500 truncate">
                {data.job_type}
              </p>
            )}

            {/* Secondary Info Row */}
            <div className="flex items-center gap-3 text-sm">
              {/* Amount */}
              {showAmount && data.total !== undefined && data.total > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-bold text-blue-600">
                    ${data.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}

              {/* Quote Number */}
              {data.quote_number && (
                <span className="text-xs text-gray-500">
                  #{data.quote_number}
                </span>
              )}

              {/* Date - Show on mobile */}
              {displayDate && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(displayDate), 'MMM d')}</span>
                </div>
              )}
            </div>

            {/* Address - Only shown on desktop or when explicitly requested */}
            {!hideAddress && data.customer_address && (
              <div className="hidden md:flex items-start gap-1.5 text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span className="truncate">{formatShortAddress(data.customer_address)}</span>
              </div>
            )}
          </div>

          {/* Right Side: Phone Icon + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showPhone && data.customer_phone && (
              <a 
                href={`tel:${data.customer_phone}`}
                className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Call ${data.customer_phone}`}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            {/* Actions */}
            {actions && (
              <div onClick={(e) => e.stopPropagation()}>
                {actions}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
