'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Calendar, Phone, FileText, TrendingUp, Clock, MapPin, Plus, CalendarCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameDay } from 'date-fns'

interface HomeDashboardProps {
  quotes: any[]
  companyId: string
}

export function HomeDashboard({ quotes, companyId }: HomeDashboardProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    // Today's schedule
    const todayVisits = quotes.filter(q => 
      q.quote_visit_date && isToday(new Date(q.quote_visit_date))
    )
    const todayJobs = quotes.filter(q => 
      q.job_scheduled_date && isToday(new Date(q.job_scheduled_date))
    )

    // New & pending leads (need visit or quote)
    const pendingLeads = quotes.filter(q => 
      q.lead_status === 'new' || 
      q.lead_status === 'contacted' ||
      (q.lead_status === 'quote_visit_scheduled' && !q.quote_visit_date)
    )

    // Quotes needing attention (sent but not signed)
    const quotesNeedingAttention = quotes.filter(q => 
      q.lead_status === 'quoted' && 
      !q.signed_at
    )

    // This month stats
    const thisMonthQuotes = quotes.filter(q => {
      const createdDate = new Date(q.created_at)
      return createdDate >= monthStart && createdDate <= monthEnd
    })

    const signedThisMonth = thisMonthQuotes.filter(q => q.lead_status === 'signed')
    const totalSignedValue = signedThisMonth.reduce((sum, q) => sum + (q.total || 0), 0)
    const closeRate = thisMonthQuotes.length > 0 
      ? Math.round((signedThisMonth.length / thisMonthQuotes.length) * 100)
      : 0

    // High priority leads (new leads or contacted but no visit scheduled)
    const highPriorityLeads = quotes
      .filter(q => q.lead_status === 'new' || q.lead_status === 'contacted')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 3)

    // Follow-up needed (quotes sent >3 days ago, not signed)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const followUpNeeded = quotes
      .filter(q => 
        q.lead_status === 'quoted' && 
        !q.signed_at &&
        new Date(q.created_at) < threeDaysAgo
      )
      .slice(0, 3)

    // Upcoming schedule (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingSchedule = quotes
      .filter(q => {
        const visitDate = q.quote_visit_date ? new Date(q.quote_visit_date) : null
        const jobDate = q.job_scheduled_date ? new Date(q.job_scheduled_date) : null
        return (visitDate && visitDate > today && visitDate < nextWeek) ||
               (jobDate && jobDate > today && jobDate < nextWeek)
      })
      .sort((a, b) => {
        const aDate = new Date(a.quote_visit_date || a.job_scheduled_date)
        const bDate = new Date(b.quote_visit_date || b.job_scheduled_date)
        return aDate.getTime() - bDate.getTime()
      })
      .slice(0, 3)

    // Weekly calendar view
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }) // Sunday
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    
    const weeklySchedule = weekDays.map(day => {
      const dayEvents = quotes.filter(q => {
        const visitDate = q.quote_visit_date ? new Date(q.quote_visit_date) : null
        const jobDate = q.job_scheduled_date ? new Date(q.job_scheduled_date) : null
        return (visitDate && isSameDay(visitDate, day)) || (jobDate && isSameDay(jobDate, day))
      })
      return {
        date: day,
        events: dayEvents
      }
    })

    return {
      todayVisits,
      todayJobs,
      pendingLeadsCount: pendingLeads.length,
      quotesNeedingAttentionCount: quotesNeedingAttention.length,
      totalSignedValue,
      signedCount: signedThisMonth.length,
      closeRate,
      highPriorityLeads,
      followUpNeeded,
      upcomingSchedule,
      weeklySchedule
    }
  }, [quotes])

  return (
  <div className="space-y-6">
      {/* Main Overview Cards - Compact 2x2 Grid */}
  <div className="grid grid-cols-2 gap-3">
        {/* Today's Schedule */}
        <Link href="/work">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Today</CardTitle>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm font-bold">{stats.todayVisits.length + stats.todayJobs.length}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.todayVisits.length}v • {stats.todayJobs.length}j
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* This Month */}
        <Link href="/analytics">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Month</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm font-bold text-green-600">${(stats.totalSignedValue / 1000).toFixed(1)}k</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {stats.signedCount} • {stats.closeRate}%
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Leads */}
        <Link href="/leads?tab=leads">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Leads</CardTitle>
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm font-bold text-[#2563eb]">{stats.pendingLeadsCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Need attention
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Quotes Pending */}
        <Link href="/leads?tab=quotes">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Quotes</CardTitle>
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm font-bold">{stats.quotesNeedingAttentionCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Not signed
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's Details */}
      {stats.todayVisits.length + stats.todayJobs.length > 0 && (
        <Card>
          <CardHeader className="px-3 pt-3 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {[...stats.todayVisits, ...stats.todayJobs].map((item, idx) => (
              <Link 
                key={idx} 
                href={`/quotes/new?id=${item.id}`}
                className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${item.quote_visit_date ? 'bg-[#2563eb]' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.quote_visit_date ? 'Quote Visit' : 'Scheduled Job'}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card>
        <CardHeader className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-pulse" />
            <CardTitle className="text-xs font-medium text-muted-foreground">Daily Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {stats.todayVisits.length + stats.todayJobs.length > 0 
              ? `You have ${stats.todayVisits.length + stats.todayJobs.length} appointments today. `
              : "No appointments today. "}
            {stats.pendingLeadsCount > 0 
              ? `${stats.pendingLeadsCount} lead${stats.pendingLeadsCount > 1 ? 's need' : ' needs'} your attention. `
              : ""}
            {stats.quotesNeedingAttentionCount > 0 
              ? `${stats.quotesNeedingAttentionCount} quote${stats.quotesNeedingAttentionCount > 1 ? 's are' : ' is'} awaiting signature. `
              : ""}
            {stats.signedCount > 0 
              ? `Great work! You've signed ${stats.signedCount} job${stats.signedCount > 1 ? 's' : ''} this month for $${(stats.totalSignedValue / 1000).toFixed(1)}k.`
              : "Focus on closing deals to hit your monthly target."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
