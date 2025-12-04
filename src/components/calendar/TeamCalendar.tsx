// @ts-nocheck - FullCalendar types
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/dashboard-context'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { 
  Calendar as CalendarIcon, 
  Users, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import './calendar.css'

interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  color: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    type: 'quote_visit' | 'scheduled_job'
    quoteId?: string
    leadId?: string
    customerId?: string
    customerName: string
    customerPhone?: string
    customerAddress?: string
    jobName?: string
    total?: number
    technicianId?: string
  }
}

interface UnscheduledJob {
  id: string
  type: 'lead' | 'quote'
  customerName: string
  customerPhone?: string
  customerAddress?: string
  jobName?: string
  total?: number
  createdAt: string
}

interface TeamCalendarProps {
  mode?: 'full' | 'compact'
  defaultView?: 'team' | 'personal'
  onEventClick?: (eventId: string, type: 'quote_visit' | 'scheduled_job') => void
  className?: string
}

export function TeamCalendar({ 
  mode = 'full', 
  defaultView = 'team',
  onEventClick,
  className 
}: TeamCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const externalEventsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { quotes, refreshQuotes } = useDashboard()
  
  const [viewMode, setViewMode] = useState<'team' | 'personal'>(defaultView)
  const [calendarView, setCalendarView] = useState<'timeGridWeek' | 'timeGridDay' | 'dayGridMonth'>('timeGridWeek')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [calendarTitle, setCalendarTitle] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Color palette for technicians
  const technicianColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ]

  // Load team members and current user
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        // Get company ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user?.id)
          .single()

        if (!company) {
          // Try team_members table
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('company_id')
            .eq('user_id', user?.id)
            .single()

          if (teamMember) {
            await loadTeamMembers(teamMember.company_id)
          }
        } else {
          await loadTeamMembers(company.id)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  async function loadTeamMembers(companyId: string) {
    // Get team members with user info
    const { data: members } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq('company_id', companyId)

    // Also get company owner
    const { data: company } = await supabase
      .from('companies')
      .select('user_id, name')
      .eq('id', companyId)
      .single()

    const { data: ownerUser } = await supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', company?.user_id)
      .single()
      .catch(() => ({ data: null }))

    const allMembers: TeamMember[] = []

    // Add owner first
    if (company) {
      allMembers.push({
        id: company.user_id,
        user_id: company.user_id,
        name: 'Owner',
        email: '',
        role: 'owner',
        color: technicianColors[0]
      })
    }

    // Add team members
    if (members) {
      members.forEach((member, index) => {
        const userData = member.users as any
        allMembers.push({
          id: member.id,
          user_id: member.user_id,
          name: userData?.raw_user_meta_data?.full_name || userData?.email?.split('@')[0] || 'Team Member',
          email: userData?.email || '',
          role: member.role,
          color: technicianColors[(index + 1) % technicianColors.length]
        })
      })
    }

    setTeamMembers(allMembers)
  }

  // Initialize external events draggable
  useEffect(() => {
    if (externalEventsRef.current && mode === 'full') {
      new Draggable(externalEventsRef.current, {
        itemSelector: '.fc-external-event',
        eventData: function(eventEl) {
          const data = JSON.parse(eventEl.getAttribute('data-event') || '{}')
          return {
            title: data.title,
            duration: '02:00',
            extendedProps: data.extendedProps
          }
        }
      })
    }
  }, [mode, isLoading])

  // Build calendar events from quotes and leads
  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = []

    quotes.forEach(item => {
      // Scheduled jobs (from quotes table with scheduled_at)
      if (item._type === 'quote' && item.scheduled_at) {
        events.push({
          id: `job-${item.id}`,
          title: item.job_name || item.customer?.name || 'Scheduled Job',
          start: item.scheduled_at,
          end: new Date(new Date(item.scheduled_at).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          textColor: '#ffffff',
          extendedProps: {
            type: 'scheduled_job',
            quoteId: item.id,
            customerId: item.customer_id,
            customerName: item.customer?.name || 'Unknown',
            customerPhone: item.customer?.phone,
            customerAddress: item.customer?.address,
            jobName: item.job_name,
            total: item.total,
            technicianId: item.assigned_to
          }
        })
      }

      // Quote visits (from leads table with scheduled_visit_at)
      if (item._type === 'lead' && item.scheduled_visit_at) {
        events.push({
          id: `visit-${item.id}`,
          title: `Visit: ${item.customer?.name || 'Unknown'}`,
          start: item.scheduled_visit_at,
          end: new Date(new Date(item.scheduled_visit_at).getTime() + 1 * 60 * 60 * 1000).toISOString(),
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          textColor: '#ffffff',
          extendedProps: {
            type: 'quote_visit',
            leadId: item.id,
            customerId: item.customer_id,
            customerName: item.customer?.name || 'Unknown',
            customerPhone: item.customer?.phone,
            customerAddress: item.customer?.address,
            jobName: item.metadata?.job_type
          }
        })
      }
    })

    // Filter by selected technician if in personal view
    if (viewMode === 'personal' && currentUserId) {
      return events.filter(e => 
        !e.extendedProps.technicianId || e.extendedProps.technicianId === currentUserId
      )
    }

    // Filter by selected technician dropdown
    if (selectedTechnician) {
      return events.filter(e => 
        !e.extendedProps.technicianId || e.extendedProps.technicianId === selectedTechnician
      )
    }

    return events
  }, [quotes, viewMode, currentUserId, selectedTechnician])

  // Unscheduled jobs for sidebar
  const unscheduledJobs = useMemo<UnscheduledJob[]>(() => {
    return quotes
      .filter(item => {
        // Quotes that are accepted/signed but not scheduled
        if (item._type === 'quote') {
          return (item.status === 'accepted' || item.status === 'signed') && !item.scheduled_at
        }
        // Leads that need visit scheduling
        if (item._type === 'lead') {
          return !item.scheduled_visit_at && ['new', 'contacted', 'qualified'].includes(item.status)
        }
        return false
      })
      .map(item => ({
        id: item.id,
        type: item._type as 'lead' | 'quote',
        customerName: item.customer?.name || 'Unknown',
        customerPhone: item.customer?.phone,
        customerAddress: item.customer?.address,
        jobName: item.job_name || item.metadata?.job_type,
        total: item.total,
        createdAt: item.created_at
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [quotes])

  // Handle event drop (drag & drop scheduling)
  const handleEventDrop = async (info: any) => {
    const { event } = info
    const newStart = event.start
    const extendedProps = event.extendedProps

    try {
      if (extendedProps.type === 'scheduled_job' && extendedProps.quoteId) {
        // Update quote scheduled_at
        const { error } = await supabase
          .from('quotes')
          .update({ scheduled_at: newStart.toISOString() })
          .eq('id', extendedProps.quoteId)

        if (error) throw error
        toast.success('Job rescheduled')
      } else if (extendedProps.type === 'quote_visit' && extendedProps.leadId) {
        // Update lead scheduled_visit_at
        const { error } = await supabase
          .from('leads')
          .update({ scheduled_visit_at: newStart.toISOString() })
          .eq('id', extendedProps.leadId)

        if (error) throw error
        toast.success('Visit rescheduled')
      }

      refreshQuotes()
    } catch (error) {
      console.error('Error rescheduling:', error)
      toast.error('Failed to reschedule')
      info.revert()
    }
  }

  // Handle external event drop (from sidebar)
  const handleExternalDrop = async (info: any) => {
    const { event } = info
    const extendedProps = event.extendedProps
    const newStart = event.start

    try {
      if (extendedProps.type === 'quote') {
        // Schedule the job
        const { error } = await supabase
          .from('quotes')
          .update({ 
            scheduled_at: newStart.toISOString(),
            status: 'scheduled'
          })
          .eq('id', extendedProps.id)

        if (error) throw error
        toast.success('Job scheduled!')
      } else if (extendedProps.type === 'lead') {
        // Schedule the visit
        const { error } = await supabase
          .from('leads')
          .update({ 
            scheduled_visit_at: newStart.toISOString(),
            status: 'contacted'
          })
          .eq('id', extendedProps.id)

        if (error) throw error
        toast.success('Visit scheduled!')
      }

      // Remove the temporary event (will be replaced by real data on refresh)
      event.remove()
      refreshQuotes()
    } catch (error) {
      console.error('Error scheduling:', error)
      toast.error('Failed to schedule')
      event.remove()
    }
  }

  // Handle event click
  const handleEventClick = (info: any) => {
    const { event } = info
    const extendedProps = event.extendedProps

    if (onEventClick) {
      onEventClick(
        extendedProps.quoteId || extendedProps.leadId,
        extendedProps.type
      )
    }
  }

  // Calendar navigation
  const goToToday = () => calendarRef.current?.getApi().today()
  const goToPrev = () => calendarRef.current?.getApi().prev()
  const goToNext = () => calendarRef.current?.getApi().next()
  
  const changeView = (view: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth') => {
    setCalendarView(view)
    calendarRef.current?.getApi().changeView(view)
  }

  const handleDatesSet = (dateInfo: any) => {
    const start = dateInfo.view.currentStart
    const end = dateInfo.view.currentEnd
    
    if (dateInfo.view.type === 'timeGridDay') {
      setCalendarTitle(format(start, 'EEEE, MMMM d, yyyy'))
    } else if (dateInfo.view.type === 'timeGridWeek') {
      setCalendarTitle(`${format(start, 'MMM d')} - ${format(new Date(end.getTime() - 1), 'MMM d, yyyy')}`)
    } else {
      setCalendarTitle(format(start, 'MMMM yyyy'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col lg:flex-row gap-4", className)}>
      {/* Unscheduled Jobs Sidebar - Desktop Only */}
      {mode === 'full' && (
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                To Schedule
                <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {unscheduledJobs.length}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">Drag onto calendar to schedule</p>
            </div>
            
            <div 
              ref={externalEventsRef}
              className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto"
            >
              {unscheduledJobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No jobs to schedule
                </p>
              ) : (
                unscheduledJobs.map(job => (
                  <div
                    key={job.id}
                    className="fc-external-event bg-white border border-gray-200 rounded-xl p-3 cursor-grab hover:shadow-md hover:border-blue-300 transition-all"
                    data-event={JSON.stringify({
                      title: job.jobName || job.customerName,
                      extendedProps: {
                        type: job.type,
                        id: job.id,
                        customerName: job.customerName
                      }
                    })}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            job.type === 'quote' ? 'bg-green-500' : 'bg-orange-500'
                          )} />
                          <span className="font-medium text-sm truncate">
                            {job.customerName}
                          </span>
                        </div>
                        {job.jobName && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {job.jobName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {job.type === 'quote' && job.total && (
                            <span className="font-semibold text-green-600">
                              ${job.total.toLocaleString()}
                            </span>
                          )}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                            job.type === 'quote' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          )}>
                            {job.type === 'quote' ? 'Job' : 'Visit'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-3">
            {/* Top Row: View Mode + Navigation */}
            <div className="flex items-center justify-between">
              {/* View Toggle */}
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={() => setViewMode('team')}
                  className={cn(
                    "px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center gap-1 md:gap-1.5",
                    viewMode === 'team'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Team</span>
                </button>
                <button
                  onClick={() => setViewMode('personal')}
                  className={cn(
                    "px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center gap-1 md:gap-1.5",
                    viewMode === 'personal'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  )}
                >
                  <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">My Schedule</span>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrev}
                  className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={goToNext}
                  className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Calendar View + Date Title */}
            <div className="flex items-center justify-between">
              {/* Calendar View Switcher */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => changeView('timeGridDay')}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded text-xs font-medium transition-colors",
                    calendarView === 'timeGridDay'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Day
                </button>
                <button
                  onClick={() => changeView('timeGridWeek')}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded text-xs font-medium transition-colors",
                    calendarView === 'timeGridWeek'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Week
                </button>
                <button
                  onClick={() => changeView('dayGridMonth')}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded text-xs font-medium transition-colors",
                    calendarView === 'dayGridMonth'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Month
                </button>
              </div>

              {/* Technician Filter (Team View - Desktop) */}
              {viewMode === 'team' && teamMembers.length > 1 && (
                <select
                  value={selectedTechnician || ''}
                  onChange={(e) => setSelectedTechnician(e.target.value || null)}
                  className="hidden md:block px-2 md:px-3 py-1.5 text-xs md:text-sm rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Team</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.user_id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Date Title */}
          <h2 className="text-base md:text-lg font-bold text-gray-900 mt-2">
            {calendarTitle}
          </h2>
        </div>

        {/* FullCalendar */}
        <div className="p-2 md:p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
            headerToolbar={false}
            events={calendarEvents}
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            eventReceive={handleExternalDrop}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
            height={isMobile ? 'auto' : 600}
            expandRows={true}
            stickyHeaderDates={true}
            dayMaxEvents={3}
            eventContent={(eventInfo) => (
              <div className="p-1 overflow-hidden">
                <div className="font-medium text-[10px] md:text-xs truncate">
                  {eventInfo.event.title}
                </div>
                {!isMobile && eventInfo.event.extendedProps.customerPhone && (
                  <div className="text-[10px] opacity-90 truncate flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />
                    {eventInfo.event.extendedProps.customerPhone}
                  </div>
                )}
              </div>
            )}
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
          />
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>Scheduled Jobs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-500"></span>
            <span>Quote Visits</span>
          </div>
        </div>
      </div>
    </div>
  )
}
