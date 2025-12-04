'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QuoteStatusBadge } from '@/components/quote-status-badge'
import { Calendar, MapPin, User, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface WorkJobCardProps {
  quote: any
  variant: 'to-schedule' | 'scheduled' | 'completed' | 'invoiced'
  onSchedule?: () => void
  onComplete?: (quoteId: string) => void
  isCompleting?: boolean
}

export function WorkJobCard({ 
  quote, 
  variant, 
  onSchedule, 
  onComplete,
  isCompleting = false 
}: WorkJobCardProps) {
  const showScheduleButton = variant === 'to-schedule' && onSchedule
  const showCompleteButton = variant === 'scheduled' && onComplete
  const isClickable = variant !== 'to-schedule'

  const cardContent = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 space-y-2">
        {/* Customer Name & Quote Number */}
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg">{quote.customer?.name || quote.customer_name || 'Customer'}</h3>
          <QuoteStatusBadge status={quote.status} size="sm" />
        </div>

        {/* Address */}
        {(quote.customer_address || quote.customer?.address) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{quote.customer_address || quote.customer?.address}</span>
          </div>
        )}

        {/* Quote Details */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold text-[#2563eb]">
              ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="text-xs">{quote.quote_number}</span>
          </div>

          {quote.scheduled_at && (
            <div className={`flex items-center gap-1.5 font-bold ${
              variant === 'scheduled' ? 'text-blue-600' : 'text-blue-600'
            }`}>
              <Calendar className="h-4 w-4" />
              <span className={variant === 'scheduled' ? '' : 'text-xs'}>
                {format(new Date(quote.scheduled_at), 'MMM d, h:mm a')}
              </span>
            </div>
          )}

          {quote.accepted_at && !quote.scheduled_at && (
            <div className="flex items-center gap-1.5 text-green-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs">
                Accepted {format(new Date(quote.accepted_at), 'MMM d')}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {quote.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {quote.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {showScheduleButton && (
        <Button
          onClick={() => onSchedule()}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] shrink-0"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule
        </Button>
      )}

      {showCompleteButton && (
        <Button
          onClick={() => onComplete(quote.id)}
          disabled={isCompleting}
          variant="outline"
          className="shrink-0 border-green-600 text-green-600 hover:bg-green-50"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isCompleting ? 'Completing...' : 'Complete'}
        </Button>
      )}
    </div>
  )

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {isClickable ? (
          <Link href={`/quotes/new?id=${quote.id}`} className="block">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </CardContent>
    </Card>
  )
}
