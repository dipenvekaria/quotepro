// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns'
import Link from 'next/link'
import { useCalendarSchedule } from '@/hooks/useCalendarSchedule'

export default function CalendarPage() {
  const { scheduledJobs, getJobsForDay } = useCalendarSchedule()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Get jobs for selected date
  const selectedDayJobs = getJobsForDay(selectedDate)

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-[#FF6200]" />
                Calendar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {scheduledJobs.length} scheduled job{scheduledJobs.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Button onClick={handleToday} className="bg-[#FF6200] hover:bg-[#E55800]">
              Today
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar - Left Side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-3">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Days */}
                  {calendarDays.map((day, index) => {
                    const dayJobs = getJobsForDay(day)
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isDayToday = isToday(day)
                    const isSelected = isSameDay(day, selectedDate)
                    const hasJobs = dayJobs.length > 0

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          aspect-square p-2 rounded-lg transition-all relative
                          ${isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}
                          ${isDayToday ? 'ring-2 ring-[#FF6200]' : ''}
                          ${isSelected ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500' : ''}
                          ${!isSelected && isCurrentMonth ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                          border border-gray-200 dark:border-gray-700
                        `}
                      >
                        <div className={`text-sm font-medium ${isCurrentMonth ? '' : 'text-muted-foreground'}`}>
                          {format(day, 'd')}
                        </div>
                        
                        {/* Job indicator */}
                        {hasJobs && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayJobs.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-[#FF6200]"
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Day Jobs - Right Side */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {format(selectedDate, 'EEEE, MMM d')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedDayJobs.length} job{selectedDayJobs.length !== 1 ? 's' : ''} scheduled
                </p>
              </CardHeader>
              <CardContent>
                {selectedDayJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No jobs scheduled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {selectedDayJobs.map((job) => (
                      <Link key={job.id} href={`/quotes/new?id=${job.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#FF6200]">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              {/* Time */}
                              <div className="flex items-center gap-2 text-[#FF6200] font-semibold">
                                <Clock className="h-4 w-4" />
                                <span>{job.time}</span>
                              </div>

                              {/* Customer */}
                              <h3 className="font-semibold">{job.customer}</h3>

                              {/* Address */}
                              {job.address && (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span className="line-clamp-2">{job.address}</span>
                                </div>
                              )}

                              {/* Total */}
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#FF6200]">
                                <DollarSign className="h-4 w-4" />
                                <span>${job.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
