'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CalendarDays, ClipboardList, Hammer, CheckCircle2, DollarSign, Search, Phone, MapPin, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ExpandableSearch } from './expandable-search'

type Quote = {
  id: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  quote_number: string
  status: string
  total: number
  created_at: string
  signed_at?: string
  job_scheduled_date?: string
  job_status?: string
  payment_status?: string
  notes?: string
}

export function WorkCalendar({ quotes }: { quotes: Quote[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')

  // All work jobs (signed quotes)
  const allJobs = useMemo(() => 
    quotes.filter(q => q.status === 'signed' || q.job_status),
    [quotes]
  )

  // Filter function
  const filterAndSort = (items: Quote[]) => {
    let filtered = items.filter(item => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = !searchQuery || 
        item.customer_name?.toLowerCase().includes(searchLower) ||
        item.quote_number?.toLowerCase().includes(searchLower) ||
        item.customer_phone?.toLowerCase().includes(searchLower) ||
        item.customer_address?.toLowerCase().includes(searchLower)
      
      // Status filter
      let matchesStatus = true
      if (statusFilter === 'to_schedule') {
        matchesStatus = !item.job_scheduled_date && (item.status === 'signed' || item.job_status === 'to_schedule')
      } else if (statusFilter === 'scheduled') {
        matchesStatus = !!item.job_scheduled_date && item.job_status !== 'in_progress' && item.job_status !== 'completed'
      } else if (statusFilter === 'in_progress') {
        matchesStatus = item.job_status === 'in_progress' || item.status === 'in-progress'
      } else if (statusFilter === 'completed') {
        matchesStatus = item.job_status === 'completed' || item.status === 'completed'
      }
      
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return (a.customer_name || '').localeCompare(b.customer_name || '')
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredJobs = filterAndSort(allJobs)
    const totalCompletedValue = completed.reduce((sum, q) => sum + (q.total || 0), 0)
    
    // Jobs at risk (in progress for more than 14 days)
    const jobsAtRisk = inProgress.filter(job => {
      const daysSinceStart = job.job_scheduled_date 
        ? differenceInDays(new Date(), new Date(job.job_scheduled_date))
        : differenceInDays(new Date(), new Date(job.signed_at || job.created_at))
      return daysSinceStart > 14
    }).length

    return {
      toScheduleCount: toSchedule.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      pendingPaymentCount: pendingPayment.length,
      totalJobValue,
      totalPendingValue,
      totalCompletedValue,
      jobsAtRisk
    }
  }, [toSchedule, inProgress, completed, pendingPayment])

  // Get quotes for selected date (future feature)
  const quotesOnSelectedDate = quotes.filter(q => {
    if (!selectedDate) return false
    const quoteDate = new Date(q.created_at)
    return (
      quoteDate.getDate() === selectedDate.getDate() &&
      quoteDate.getMonth() === selectedDate.getMonth() &&
      quoteDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  // Job Card Component with enhanced details
  const JobCard = ({ quote, statusType }: { quote: Quote; statusType: string }) => {
    const daysSinceSigned = quote.signed_at 
      ? differenceInDays(new Date(), new Date(quote.signed_at))
      : differenceInDays(new Date(), new Date(quote.created_at))

    const isAtRisk = statusType === 'in-progress' && daysSinceSigned > 14

    return (
      <a
        key={quote.id}
        href={`/quotes/new?id=${quote.id}`}
        className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base truncate">{quote.customer_name}</h3>
              {isAtRisk && (
                <Badge className="bg-red-500 text-white text-xs">⚠️ At Risk</Badge>
              )}
              {quote.payment_status === 'sent' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Invoice Sent
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{quote.quote_number}</span>
              <span>•</span>
              <span className="text-[#2563eb] font-bold">${quote.total.toLocaleString()}</span>
              {quote.signed_at && (
                <>
                  <span>•</span>
                  <span>Signed {formatDistanceToNow(new Date(quote.signed_at), { addSuffix: true })}</span>
                </>
              )}
              {statusType === 'in-progress' && (
                <>
                  <span>•</span>
                  <span className={daysSinceSigned > 7 ? 'text-blue-600 font-medium' : ''}>
                    {daysSinceSigned}d in progress
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
              {quote.customer_phone && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{quote.customer_phone}</span>
                </div>
              )}
              {quote.customer_address && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{quote.customer_address}</span>
                </div>
              )}
              {quote.job_scheduled_date && (
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <CalendarDays className="h-3 w-3" />
                  <span>Scheduled: {new Date(quote.job_scheduled_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            {statusType === 'to-schedule' && (
              <Badge variant="secondary">Ready to Schedule</Badge>
            )}
            {statusType === 'in-progress' && (
              <Badge>In Progress</Badge>
            )}
            {statusType === 'completed' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Completed
              </Badge>
            )}
            {statusType === 'pending-payment' && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Payment Due
              </Badge>
            )}
          </div>
        </div>
      </a>
    )
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
        <TabsTrigger value="calendar" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Calendar</span>
        </TabsTrigger>
        <TabsTrigger value="to-schedule" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">To Schedule</span>
          {filteredToSchedule.length > 0 && (
            <Badge variant="secondary" className="ml-1">{filteredToSchedule.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="in-progress" className="gap-2">
          <Hammer className="h-4 w-4" />
          <span className="hidden sm:inline">In Progress</span>
          {filteredInProgress.length > 0 && (
            <Badge variant="secondary" className="ml-1">{filteredInProgress.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">Completed</span>
        </TabsTrigger>
        <TabsTrigger value="pending-payment" className="gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Payment</span>
          {filteredPendingPayment.length > 0 && (
            <Badge variant="secondary" className="ml-1">{filteredPendingPayment.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Search Bar - Dedicated Row */}
      {activeTab !== 'calendar' && (
        <div className="bg-muted/30 p-3 rounded-lg">
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, phone, address..."
            className="w-full"
          />
        </div>
      )}

      {/* Filters Bar */}
      {activeTab !== 'calendar' && (
        <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg">

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="amount-high">Highest Value</SelectItem>
              <SelectItem value="amount-low">Lowest Value</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchQuery || sortBy !== 'newest') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSortBy('newest')
              }}
              className="h-9"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Calendar View */}
      <TabsContent value="calendar" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Schedule</CardTitle>
              <CardDescription>Select a date to view scheduled jobs</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Calendar View Coming Soon</p>
                <p className="text-sm mt-2">Drag-and-drop job scheduling will be available here</p>
                <p className="text-xs mt-1">For now, use the tabs to manage jobs by status</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {quotesOnSelectedDate.length} job{quotesOnSelectedDate.length !== 1 ? 's' : ''} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotesOnSelectedDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No jobs scheduled for this date</p>
                  <p className="text-sm mt-1">Scheduling feature coming soon</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotesOnSelectedDate.map((quote) => (
                    <a
                      key={quote.id}
                      href={`/quotes/new?id=${quote.id}`}
                      className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-bold">{quote.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        #{quote.quote_number} • ${quote.total.toLocaleString()}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-bold text-[#2563eb]">{toSchedule.length}</div>
              <p className="text-xs text-muted-foreground">To Schedule</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-bold text-blue-600">{inProgress.length}</div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-bold text-green-600">{completed.length}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-bold text-amber-600">{pendingPayment.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting Payment</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* To Schedule Tab */}
      <TabsContent value="to-schedule">
        <Card>
          <CardHeader>
            <CardTitle>To Schedule ({filteredToSchedule.length})</CardTitle>
            <CardDescription>
              Signed quotes ready to be scheduled
              {filteredToSchedule.length > 0 && ` • Total value: $${filteredToSchedule.reduce((sum, q) => sum + q.total, 0).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredToSchedule.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'No jobs match your search' : 'No jobs to schedule'}</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try adjusting your filters' : 'Signed quotes will appear here automatically'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredToSchedule.length} of {toSchedule.length} jobs
                  </p>
                </div>
                <div className="space-y-2">
                  {filteredToSchedule.map((quote) => (
                    <JobCard key={quote.id} quote={quote} statusType="to-schedule" />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* In Progress Tab */}
      <TabsContent value="in-progress">
        <Card>
          <CardHeader>
            <CardTitle>In Progress ({filteredInProgress.length})</CardTitle>
            <CardDescription>
              Jobs currently being worked on
              {filteredInProgress.length > 0 && ` • Total value: $${filteredInProgress.reduce((sum, q) => sum + q.total, 0).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInProgress.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hammer className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'No jobs match your search' : 'No jobs in progress'}</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try adjusting your filters' : 'Active jobs will appear here'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredInProgress.length} of {inProgress.length} jobs
                  </p>
                </div>
                <div className="space-y-2">
                  {filteredInProgress.map((quote) => (
                    <JobCard key={quote.id} quote={quote} statusType="in-progress" />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Completed Tab */}
      <TabsContent value="completed">
        <Card>
          <CardHeader>
            <CardTitle>Completed ({filteredCompleted.length})</CardTitle>
            <CardDescription>
              Successfully finished jobs
              {filteredCompleted.length > 0 && ` • Total value: $${filteredCompleted.reduce((sum, q) => sum + q.total, 0).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCompleted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'No jobs match your search' : 'No completed jobs'}</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try adjusting your filters' : 'Finished jobs will appear here'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredCompleted.length} of {completed.length} jobs
                  </p>
                </div>
                <div className="space-y-2">
                  {filteredCompleted.map((quote) => (
                    <JobCard key={quote.id} quote={quote} statusType="completed" />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pending Payment Tab */}
      <TabsContent value="pending-payment">
        <Card>
          <CardHeader>
            <CardTitle>Pending Payment ({filteredPendingPayment.length})</CardTitle>
            <CardDescription>
              Completed jobs awaiting payment
              {filteredPendingPayment.length > 0 && ` • Outstanding: $${filteredPendingPayment.reduce((sum, q) => sum + q.total, 0).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPendingPayment.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery ? 'No jobs match your search' : 'No pending payments'}</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try adjusting your filters' : 'Jobs awaiting payment will appear here'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredPendingPayment.length} of {pendingPayment.length} jobs
                  </p>
                </div>
                <div className="space-y-2">
                  {filteredPendingPayment.map((quote) => (
                    <JobCard key={quote.id} quote={quote} statusType="pending-payment" />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </>
  )
}
