// @ts-nocheck - Supabase type generation pending
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleVisitDialogProps {
  leadId: string
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
}

export function ScheduleVisitDialog({ 
  leadId, 
  customerName, 
  open, 
  onOpenChange,
  onScheduled 
}: ScheduleVisitDialogProps) {
  const [visitDate, setVisitDate] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  const handleSchedule = async () => {
    if (!visitDate || !visitTime) {
      toast.error('Please select both date and time')
      return
    }

    setIsScheduling(true)
    try {
      const supabase = createClient()
      
      // Combine date and time into a timestamp
      const scheduledAt = new Date(`${visitDate}T${visitTime}:00`)
      
      // Update the work_item with scheduled visit time
      const { error } = await supabase
        .from('work_items')
        .update({
          scheduled_at: scheduledAt.toISOString()
        })
        .eq('id', leadId)

      if (error) throw error

      // Get company_id for activity log
      const { data: lead } = await supabase
        .from('work_items')
        .select('company_id')
        .eq('id', leadId)
        .single()

      // Log to activity_log (new schema)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && lead) {
        await supabase.from('activity_log').insert({
          company_id: lead.company_id,
          user_id: user.id,
          entity_type: 'lead',
          entity_id: leadId,
          action: 'visit_scheduled',
          description: `Visit scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          metadata: {
            scheduled_at: scheduledAt.toISOString(),
            customer_name: customerName
          },
        })
      }

      toast.success('Visit scheduled successfully!')
      onOpenChange(false)
      onScheduled?.()
    } catch (error) {
      console.error('Error scheduling visit:', error)
      toast.error('Failed to schedule visit')
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Schedule Quote Visit
          </DialogTitle>
          <DialogDescription>
            Schedule a visit with {customerName} to provide a quote
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="visitDate">Visit Date</Label>
            <Input
              id="visitDate"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitTime">Visit Time</Label>
            <Input
              id="visitTime"
              type="time"
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!visitDate || !visitTime || isScheduling}
            className="bg-blue-500 hover:bg-blue-700"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
