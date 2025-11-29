// @ts-nocheck - Supabase type generation pending
'use client'

import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Users, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'

export default function HomePage() {
  const { quotes } = useDashboard()

  // Calculate stats
  const stats = useMemo(() => {
    if (!quotes || quotes.length === 0) {
      return {
        leads: 0,
        quotes: 0,
        scheduledToday: 0,
        totalRevenue: 0,
        pendingRevenue: 0
      }
    }

    const scheduledToday = quotes.filter(q => {
      if (!q.scheduled_at) return false
      try {
        return isToday(parseISO(q.scheduled_at))
      } catch {
        return false
      }
    })

    return {
      leads: quotes.filter(q => 
        ['new', 'contacted', 'quote_visit_scheduled'].includes(q.lead_status) && 
        (!q.total || q.total === 0)
      ).length,
      quotes: quotes.filter(q => 
        (['quoted', 'lost'].includes(q.lead_status) || (q.total && q.total > 0)) &&
        !q.accepted_at && !q.signed_at
      ).length,
      scheduledToday: scheduledToday.length,
      totalRevenue: quotes
        .filter(q => q.paid_at)
        .reduce((sum, q) => sum + (q.total || 0), 0),
      pendingRevenue: quotes
        .filter(q => q.completed_at && !q.paid_at)
        .reduce((sum, q) => sum + (q.total || 0), 0)
    }
  }, [quotes])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome Back!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Leads */}
        <Link href="/leads-and-quotes/leads">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Leads
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.leads}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Quotes */}
        <Link href="/leads-and-quotes/quotes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Quotes
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.quotes}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Scheduled Today */}
        <Link href="/work/scheduled">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Scheduled Today
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.scheduledToday}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Revenue */}
        <Link href="/pay/invoice">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    ${stats.pendingRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Revenue Card */}
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>All-time completed and paid jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Lifetime earnings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/leads/new"
              className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Create New Lead</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Capture a new customer inquiry</p>
            </Link>
            <Link 
              href="/quotes/new"
              className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Generate Quote</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create a quote with AI assistance</p>
            </Link>
            <Link 
              href="/work/to-be-scheduled"
              className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">Schedule Jobs</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and schedule accepted quotes</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
