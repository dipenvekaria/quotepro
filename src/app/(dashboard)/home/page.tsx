// @ts-nocheck - Supabase type generation pending
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Users, 
  FileText, 
  Calendar, 
  TrendingUp,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useHomeStats } from '@/hooks/useHomeStats'

export default function HomePage() {
  const stats = useHomeStats()

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome Back!
        </h1>
        <p className="text-gray-600">
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
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Active Leads
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.leads}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-7 h-7 text-white" />
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
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Pending Quotes
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.quotes}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <FileText className="w-7 h-7 text-white" />
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
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Scheduled Today
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.scheduledToday}
                  </p>
                </div>
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-7 h-7 text-white" />
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
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Pending Revenue
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${stats.pendingRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center shadow-md">
                  <Clock className="w-7 h-7 text-white" />
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
                <p className="text-sm font-bold text-gray-900">
                  ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
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
              className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <p className="font-bold text-gray-900">Create New Lead</p>
              <p className="text-sm text-gray-600">Capture a new customer inquiry</p>
            </Link>
            <Link 
              href="/quotes/new"
              className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <p className="font-bold text-gray-900">Generate Quote</p>
              <p className="text-sm text-gray-600">Create a quote with AI assistance</p>
            </Link>
            <Link 
              href="/work"
              className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <p className="font-bold text-gray-900">Schedule Jobs</p>
              <p className="text-sm text-gray-600">View and schedule accepted quotes</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
