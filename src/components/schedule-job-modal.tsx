'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface ScheduleJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: {
    id: string
    customer_name: string
    customer_address: string
    total: number
  }
  onSchedule: (quoteId: string, scheduledDate: Date) => Promise<void>
}

const TIME_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

export function ScheduleJobModal({ open, onOpenChange, quote, onSchedule }: ScheduleJobModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [isScheduling, setIsScheduling] = useState(false)

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both a date and time')
      return
    }

    setIsScheduling(true)
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.includes('PM') && !selectedTime.startsWith('12')
        ? [parseInt(selectedTime.split(':')[0]) + 12, 0]
        : [parseInt(selectedTime.split(':')[0]), 0]
      
      const scheduledDate = new Date(selectedDate)
      scheduledDate.setHours(hours, minutes, 0, 0)

      await onSchedule(quote.id, scheduledDate)
      
      // Reset and close
      setSelectedDate('')
      setSelectedTime('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to schedule job:', error)
      alert('Failed to schedule job. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#FF6200]" />
            Schedule Job
          </DialogTitle>
          <DialogDescription>
            Schedule this job for {quote.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-sm font-semibold">{quote.customer_name}</p>
              <p className="text-sm text-muted-foreground">{quote.customer_address}</p>
            </div>
            <div className="text-lg font-bold text-[#FF6200]">
              ${quote.total.toFixed(2)}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedTime === time
                      ? 'bg-[#FF6200] text-white border-[#FF6200]'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime || isScheduling}
            className="bg-[#FF6200] hover:bg-[#E55800]"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
