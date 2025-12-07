// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/lib/dashboard-context'
import { useUserRole } from '@/hooks/use-user-role'
import { canViewCalendar, isTechnician } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Calendar,
  Play,
  CheckCircle,
  DollarSign,
  Phone,
  Navigation
} from 'lucide-react'
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'paid'

interface Job {
  id: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  job_name?: string
  description?: string
  scheduled_at: string
  status: JobStatus
  total: number
  assigned_to?: string
}

export default function WorkPage() {
  const router = useRouter()
  const { workItems, refreshWorkItems } = useDashboard()
  const { role } = useUserRole()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null)

  // Get current user ID
  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    getUser()
  }, [])

  // For technicians, filter to only their assigned jobs
  // For office staff, show all scheduled/in_progress jobs
  const myJobs = useMemo(() => {
    return workItems
      .filter(q => {
        // Only scheduled or in_progress status
        if (!['scheduled', 'in_progress'].includes(q.status)) return false
        
        // Must have a scheduled date
        if (!q.scheduled_at) return false
        
        // For technicians, only show their assigned jobs
        if (isTechnician(role) && currentUserId) {
          return q.assigned_to === currentUserId
        }
        
        // For office staff, show all
        return true
      })
      .map(q => ({
        id: q.id,
        customer_name: q.customer?.name || 'Customer',
        customer_phone: q.customer?.phone,
        customer_address: q.customer?.address,
        job_name: q.job_name || q.description,
        description: q.description,
        scheduled_at: q.scheduled_at,
        status: getJobStatus(q),
        total: q.total || 0,
        assigned_to: q.assigned_to
      }))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }, [workItems, role, currentUserId])

  // Split jobs by time period
  const todayJobs = myJobs.filter(j => isToday(parseISO(j.scheduled_at)))
  const tomorrowJobs = myJobs.filter(j => isTomorrow(parseISO(j.scheduled_at)))
  const thisWeekJobs = myJobs.filter(j => {
    const date = parseISO(j.scheduled_at)
    return isThisWeek(date) && !isToday(date) && !isTomorrow(date)
  })
  const upcomingJobs = myJobs.filter(j => {
    const date = parseISO(j.scheduled_at)
    return !isThisWeek(date)
  })

  function getJobStatus(quote: any): JobStatus {
    if (quote.paid_at) return 'paid'
    if (quote.invoice_sent_at) return 'invoiced'
    if (quote.completed_at) return 'completed'
    if (quote.started_at) return 'in_progress'
    return 'scheduled'
  }

  const handleStartJob = async (jobId: string) => {
    setUpdatingJobId(jobId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('work_items')
        .update({ started_at: new Date().toISOString(), status: 'in_progress' })
        .eq('id', jobId)
      
      if (error) throw error
      toast.success('Job started!')
      await refreshWorkItems()
    } catch (err) {
      toast.error('Failed to start job')
    } finally {
      setUpdatingJobId(null)
    }
  }

  const handleCompleteJob = (jobId: string) => {
    // Navigate to job completion page with signature capture
    router.push(`/work/${jobId}/complete`)
  }

  const getStatusBadge = (status: JobStatus) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      invoiced: 'bg-purple-100 text-purple-700',
      paid: 'bg-emerald-100 text-emerald-700'
    }
    const labels = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      invoiced: 'Invoice Sent',
      paid: 'Paid'
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const renderJobCard = (job: Job) => (
    <Card key={job.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Time and Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                <Clock className="h-4 w-4" />
                <span>{format(parseISO(job.scheduled_at), 'h:mm a')}</span>
              </div>
              {getStatusBadge(job.status)}
            </div>

            {/* Customer Name */}
            <h3 className="font-bold text-lg">{job.customer_name}</h3>

            {/* Job Name */}
            {job.job_name && (
              <p className="text-sm text-gray-600">{job.job_name}</p>
            )}

            {/* Address */}
            {job.customer_address && (
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{job.customer_address}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <DollarSign className="h-4 w-4" />
              <span>${job.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {job.status === 'scheduled' && (
              <Button
                onClick={() => handleStartJob(job.id)}
                disabled={updatingJobId === job.id}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            
            {job.status === 'in_progress' && (
              <Button
                onClick={() => handleCompleteJob(job.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}

            {job.customer_phone && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.location.href = `tel:${job.customer_phone}`}
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}

            {job.customer_address && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(job.customer_address)}`, '_blank')}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderSection = (title: string, jobs: Job[]) => {
    if (jobs.length === 0) return null
    
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</h2>
        {jobs.map(renderJobCard)}
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Work</h1>
              <p className="text-sm text-gray-600">
                {myJobs.length} job{myJobs.length !== 1 ? 's' : ''} • {todayJobs.length} today
              </p>
            </div>
            
            {/* Only show calendar button for office staff */}
            {canViewCalendar(role) && (
              <Button
                onClick={() => router.push('/calendar')}
                variant="outline"
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {myJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="font-bold text-lg mb-2">No Jobs Scheduled</h3>
              <p className="text-sm text-gray-500">
                {isTechnician(role) 
                  ? "You don't have any jobs assigned yet."
                  : "No scheduled jobs. Use the Calendar to schedule work."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {renderSection('Today', todayJobs)}
            {renderSection('Tomorrow', tomorrowJobs)}
            {renderSection('This Week', thisWeekJobs)}
            {renderSection('Upcoming', upcomingJobs)}
          </>
        )}
      </main>
    </div>
  )
}
