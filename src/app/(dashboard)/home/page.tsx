// @ts-nocheck - Supabase type generation pending
'use client'

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { useRouter } from 'next/navigation'
import { QueueHeader, QueueCard, EmptyQueue } from '@/components/queues'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  FileText,
  DollarSign,
  AlertCircle,
  Phone,
  MapPin,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, isToday, isTomorrow, format, startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'

export default function HomePage() {
  const { quotes, company } = useDashboard()
  const router = useRouter()

  // Calculate statistics and tasks
  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return {
        todayVisits: [],
        todayJobs: [],
        tomorrowVisits: [],
        tomorrowJobs: [],
        highPriorityLeads: [],
        quotesNeedingFollowup: [],
        jobsToSchedule: [],
        totalRevenue: 0,
        quotesThisMonth: 0,
        signedThisMonth: 0
      }
    }

    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    // Today's scheduled items
    const todayVisits = quotes.filter(q => 
      q?.quote_visit_date && isToday(new Date(q.quote_visit_date))
    )
    const todayJobs = quotes.filter(q => 
      q?.scheduled_at && isToday(new Date(q.scheduled_at))
    )

    // Tomorrow's schedule
    const tomorrowVisits = quotes.filter(q => 
      q?.quote_visit_date && isTomorrow(new Date(q.quote_visit_date))
    )
    const tomorrowJobs = quotes.filter(q => 
      q?.scheduled_at && isTomorrow(new Date(q.scheduled_at))
    )

    // High priority leads (new or contacted, no visit scheduled)
    const highPriorityLeads = quotes
      .filter(q => 
        q && (q.lead_status === 'new' || q.lead_status === 'contacted') &&
        (!q.total || q.total === 0)
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5)

    // Quotes needing follow-up (sent but not accepted)
    const quotesNeedingFollowup = quotes
      .filter(q => 
        q && (q.lead_status === 'quoted' || (q.total && q.total > 0)) &&
        !q.accepted_at && 
        !q.signed_at
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5)

    // Jobs to be scheduled (accepted but not scheduled)
    const jobsToSchedule = quotes
      .filter(q => 
        q && (q.accepted_at || q.signed_at) && 
        !q.scheduled_at &&
        !q.completed_at
      )
      .slice(0, 5)

    // This month stats
    const thisMonthQuotes = quotes.filter(q => {
      if (!q?.created_at) return false
      const createdDate = new Date(q.created_at)
      return createdDate >= monthStart && createdDate <= monthEnd
    })
    
    const signedThisMonth = thisMonthQuotes.filter(q => q?.signed_at || q?.accepted_at)
    const totalRevenue = signedThisMonth.reduce((sum, q) => sum + (q?.total || 0), 0)

    return {
      todayVisits,
      todayJobs,
      tomorrowVisits,
      tomorrowJobs,
      highPriorityLeads,
      quotesNeedingFollowup,
      jobsToSchedule,
      totalRevenue,
      quotesThisMonth: thisMonthQuotes.length,
      signedThisMonth: signedThisMonth.length
    }
  }, [quotes])

  const totalTasksToday = stats.todayVisits.length + stats.todayJobs.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <QueueHeader
        title="Home"
        description={`Welcome back! Here's your overview for ${format(new Date(), 'EEEE, MMMM d')}`}
      />

      {/* Quick Stats - Mobile First 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/leads-and-quotes/leads')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.highPriorityLeads.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/leads-and-quotes/quotes')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.quotesNeedingFollowup.length}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/work/to-be-scheduled')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalTasksToday}</div>
            <p className="text-xs text-muted-foreground">{stats.todayVisits.length}v • {stats.todayJobs.length}j</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/analytics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${(stats.totalRevenue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground">{stats.signedThisMonth} signed</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      {totalTasksToday > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Today's Schedule
            </h2>
            <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {totalTasksToday} {totalTasksToday === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          <div className="space-y-2">
            {stats.todayVisits.map((visit) => (
              <QueueCard
                key={visit.id}
                data={{
                  id: visit.id,
                  customer_name: visit.customer_name || 'Unknown Customer',
                  customer_address: visit.customer_address,
                  scheduled_at: visit.quote_visit_date,
                  total: visit.total
                }}
                badge={
                  <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                    Quote Visit • {format(new Date(visit.quote_visit_date), 'h:mm a')}
                  </Badge>
                }
                showAmount={false}
                dateLabel="Visit"
                onClick={() => router.push(`/leads/new?id=${visit.id}`)}
              />
            ))}

            {stats.todayJobs.map((job) => (
              <QueueCard
                key={job.id}
                data={{
                  id: job.id,
                  customer_name: job.customer_name || 'Unknown Customer',
                  customer_address: job.customer_address,
                  scheduled_at: job.scheduled_at,
                  total: job.total
                }}
                badge={
                  <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Job • {format(new Date(job.scheduled_at), 'h:mm a')}
                  </Badge>
                }
                dateLabel="Scheduled"
                onClick={() => router.push(`/work/scheduled`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* High Priority Leads */}
      {stats.highPriorityLeads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              High Priority Leads
            </h2>
            <Link href="/leads-and-quotes/leads">
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {stats.highPriorityLeads.map((lead) => (
              <QueueCard
                key={lead.id}
                data={{
                  id: lead.id,
                  customer_name: lead.customer_name || 'Unknown Customer',
                  customer_address: lead.customer_address,
                  created_at: lead.created_at,
                  total: 0
                }}
                badge={
                  <Badge variant="outline" className="border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400">
                    {lead.lead_status === 'new' ? 'New' : 'Contacted'} • {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </Badge>
                }
                showAmount={false}
                onClick={() => router.push(`/leads/new?id=${lead.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quotes Needing Follow-up */}
      {stats.quotesNeedingFollowup.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Quotes Pending
            </h2>
            <Link href="/leads-and-quotes/quotes">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {stats.quotesNeedingFollowup.map((quote) => (
              <QueueCard
                key={quote.id}
                data={{
                  id: quote.id,
                  customer_name: quote.customer_name || 'Unknown Customer',
                  customer_address: quote.customer_address,
                  created_at: quote.created_at,
                  total: quote.total
                }}
                badge={
                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    Q-{quote.quote_number || quote.id.slice(0, 6)} • {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                  </Badge>
                }
                dateLabel="Created"
                onClick={() => router.push(`/leads/new?id=${quote.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Jobs to Schedule */}
      {stats.jobsToSchedule.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Jobs to Schedule
            </h2>
            <Link href="/work/to-be-scheduled">
              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {stats.jobsToSchedule.map((job) => (
              <QueueCard
                key={job.id}
                data={{
                  id: job.id,
                  customer_name: job.customer_name || 'Unknown Customer',
                  customer_address: job.customer_address,
                  created_at: job.accepted_at || job.signed_at,
                  total: job.total
                }}
                badge={
                  <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                    Accepted • {formatDistanceToNow(new Date(job.accepted_at || job.signed_at), { addSuffix: true })}
                  </Badge>
                }
                dateLabel="Accepted"
                onClick={() => router.push('/work/to-be-scheduled')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalTasksToday === 0 && 
       stats.highPriorityLeads.length === 0 && 
       stats.quotesNeedingFollowup.length === 0 && 
       stats.jobsToSchedule.length === 0 && (
        <EmptyQueue
          icon={CheckCircle2}
          title="All Caught Up!"
          message="You have no pending tasks or high-priority items. Great work!"
          action={
            <Button onClick={() => router.push('/leads-and-quotes/leads')} className="bg-orange-600 hover:bg-orange-700">
              View All Leads
            </Button>
          }
        />
      )}
    </div>
  )
}
