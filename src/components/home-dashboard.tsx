'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Calendar, Phone, FileText, TrendingUp, Clock, MapPin, Plus, CalendarCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow, isToday, startOfMonth, endOfMonth } from 'date-fns'

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
    ).slice(0, 3)

    // Quotes needing attention (sent but not signed)
    const quotesNeedingAttention = quotes.filter(q => 
      q.lead_status === 'quoted' && 
      !q.signed_at
    ).slice(0, 3)

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

    return {
      todayVisits,
      todayJobs,
      pendingLeads,
      pendingLeadsCount: quotes.filter(q => 
        q.lead_status === 'new' || 
        q.lead_status === 'contacted' ||
        (q.lead_status === 'quote_visit_scheduled' && !q.quote_visit_date)
      ).length,
      quotesNeedingAttention,
      quotesNeedingAttentionCount: quotes.filter(q => 
        q.lead_status === 'quoted' && 
        !q.signed_at
      ).length,
      totalSignedValue,
      signedCount: signedThisMonth.length,
      closeRate
    }
  }, [quotes])

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Schedule */}
        <Link href="/work">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">Today's Schedule</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Visits and jobs</CardDescription>
                </div>
                <Calendar className="h-7 w-7 md:h-8 md:w-8 text-[#FF6200]" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-[#FF6200]">
                      {stats.todayVisits.length + stats.todayJobs.length}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {stats.todayVisits.length} visits • {stats.todayJobs.length} jobs
                    </p>
                  </div>
                </div>

                {stats.todayVisits.length + stats.todayJobs.length > 0 ? (
                  <div className="space-y-2 pt-3 border-t">
                    {[...stats.todayVisits, ...stats.todayJobs].slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs md:text-sm">
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${item.quote_visit_date ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <span className="font-medium truncate flex-1">{item.customer_name}</span>
                        <span className="text-muted-foreground text-xs flex-shrink-0">
                          {item.quote_visit_date ? '📋' : '🔨'}
                        </span>
                      </div>
                    ))}
                    {stats.todayVisits.length + stats.todayJobs.length > 3 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        +{stats.todayVisits.length + stats.todayJobs.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <CalendarCheck className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs md:text-sm">No events today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* This Month So Far */}
        <Link href="/analytics">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">This Month So Far</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Performance metrics</CardDescription>
                </div>
                <TrendingUp className="h-7 w-7 md:h-8 md:w-8 text-[#FF6200]" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Signed Value</p>
                  <p className="text-3xl md:text-4xl font-bold text-[#FF6200]">
                    ${(stats.totalSignedValue / 1000).toFixed(1)}k
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Signed</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.signedCount}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Close Rate</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.closeRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Action Items Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* New & Pending Leads */}
        <Link href="/leads?tab=leads">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">New & Pending Leads</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Need attention</CardDescription>
                </div>
                <Phone className="h-7 w-7 md:h-8 md:w-8 text-[#FF6200]" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-3xl md:text-4xl font-bold text-[#FF6200]">
                    {stats.pendingLeadsCount}
                  </p>
                  {stats.pendingLeadsCount > 0 && (
                    <Badge className="bg-red-500 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Action
                    </Badge>
                  )}
                </div>

                {stats.pendingLeads.length > 0 ? (
                  <div className="space-y-2 pt-3 border-t">
                    {stats.pendingLeads.map((lead) => (
                      <div key={lead.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs md:text-sm truncate">{lead.customer_name}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">{lead.customer_phone}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] md:text-xs flex-shrink-0">
                          {lead.lead_status === 'new' ? 'New' : 
                           lead.lead_status === 'contacted' ? 'Called' : 'Visit'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs md:text-sm">All caught up</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Quotes Needing Attention */}
        <Link href="/leads?tab=quotes">
          <Card className="hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">Quotes Pending</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Not signed yet</CardDescription>
                </div>
                <FileText className="h-7 w-7 md:h-8 md:w-8 text-[#FF6200]" />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-3xl md:text-4xl font-bold text-[#FF6200]">
                    {stats.quotesNeedingAttentionCount}
                  </p>
                  {stats.quotesNeedingAttentionCount > 0 && (
                    <Badge className="bg-blue-500 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>

                {stats.quotesNeedingAttention.length > 0 ? (
                  <div className="space-y-2 pt-3 border-t">
                    {stats.quotesNeedingAttention.map((quote) => (
                      <div key={quote.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs md:text-sm truncate">{quote.customer_name}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            Sent {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="text-xs md:text-sm font-semibold text-[#FF6200] flex-shrink-0">
                          ${(quote.total / 1000).toFixed(1)}k
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 md:py-6 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs md:text-sm">All signed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-xs md:text-sm">Common tasks</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Button
              asChild
              size="lg"
              className="h-16 md:h-20 bg-[#FF6200] hover:bg-[#FF6200]/90 active:scale-[0.98] transition-all flex flex-col gap-1.5 md:gap-2"
            >
              <Link href="/leads?schedule_visit=true">
                <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                <span className="text-xs md:text-sm font-semibold">Schedule Visit</span>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-16 md:h-20 active:scale-[0.98] transition-all flex flex-col gap-1.5 md:gap-2 border-[#FF6200] text-[#FF6200] hover:bg-[#FF6200]/10"
            >
              <Link href="/quotes/new">
                <FileText className="h-5 w-5 md:h-6 md:w-6" />
                <span className="text-xs md:text-sm font-semibold">New Quote</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
