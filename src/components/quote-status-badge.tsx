'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, Send, Bell, BellRing, XCircle, CheckCircle2, FileSignature, Ban } from 'lucide-react'

export type QuoteFollowupStatus = 'draft' | 'sent' | 'reminder_1' | 'reminder_2' | 'expired' | 'accepted' | 'signed' | 'declined'

interface QuoteStatusBadgeProps {
  status: QuoteFollowupStatus
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function QuoteStatusBadge({ status, size = 'md', showIcon = true }: QuoteStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          icon: Clock,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
        }
      case 'sent':
        return {
          label: 'Sent',
          icon: Send,
          className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300',
        }
      case 'reminder_1':
        return {
          label: '1st Reminder',
          icon: Bell,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300',
        }
      case 'reminder_2':
        return {
          label: '2nd Reminder',
          icon: BellRing,
          className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300',
        }
      case 'expired':
        return {
          label: 'Expired',
          icon: XCircle,
          className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300',
        }
      case 'accepted':
        return {
          label: 'Accepted',
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300',
        }
      case 'signed':
        return {
          label: 'Signed',
          icon: FileSignature,
          className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300',
        }
      case 'declined':
        return {
          label: 'Declined',
          icon: Ban,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400',
        }
      default:
        return {
          label: 'Unknown',
          icon: Clock,
          className: 'bg-gray-100 text-gray-700 border-gray-300',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} font-medium inline-flex items-center`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  )
}

// Helper function to get the next logical status
export function getNextStatus(currentStatus: QuoteFollowupStatus): QuoteFollowupStatus | null {
  const workflow: Record<QuoteFollowupStatus, QuoteFollowupStatus | null> = {
    draft: 'sent',
    sent: 'reminder_1',
    reminder_1: 'reminder_2',
    reminder_2: 'expired',
    expired: null, // Terminal state
    accepted: null, // Terminal state
    signed: null, // Terminal state
    declined: null, // Terminal state
  }
  
  return workflow[currentStatus]
}

// Helper function to check if quote can be scheduled
export function canScheduleQuote(status: QuoteFollowupStatus): boolean {
  return status === 'accepted'
}
