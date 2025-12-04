// @ts-nocheck
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TeamCalendar } from './TeamCalendar'
import { Calendar } from 'lucide-react'

interface CalendarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
  title?: string
}

export function CalendarModal({ 
  open, 
  onOpenChange,
  onScheduled,
  title = 'Schedule'
}: CalendarModalProps) {
  const handleEventClick = (eventId: string, type: 'quote_visit' | 'scheduled_job') => {
    // Close modal after scheduling
    onOpenChange(false)
    onScheduled?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-gray-200 bg-gray-50">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <TeamCalendar 
            mode="full"
            defaultView="team"
            onEventClick={handleEventClick}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
