'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentsContentProps {
  companyId: string
}

export function PaymentsContent({ companyId }: PaymentsContentProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">
          Track and collect payments from customers
        </p>
      </div>

      {/* Coming Soon Message */}
      <Card className="border-2 border-[#FF6200]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF6200]/10 rounded-full">
              <DollarSign className="h-8 w-8 text-[#FF6200]" />
            </div>
            <div>
              <CardTitle className="text-2xl">Payment Features Coming Soon</CardTitle>
              <CardDescription className="text-base mt-1">
                We're building powerful payment tracking and collection tools
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            The Payments section will help you manage your business finances more effectively:
          </p>

          {/* Upcoming Features */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <TrendingUp className="h-5 w-5 text-[#FF6200] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Payment Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor payments received, pending, and overdue in real-time
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <DollarSign className="h-5 w-5 text-[#FF6200] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Payment Collection</h3>
                <p className="text-sm text-muted-foreground">
                  Send payment requests and accept online payments from customers
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <Clock className="h-5 w-5 text-[#FF6200] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Payment Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic reminders for overdue invoices and pending payments
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <CheckCircle2 className="h-5 w-5 text-[#FF6200] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Payment History</h3>
                <p className="text-sm text-muted-foreground">
                  Complete payment history and transaction records for all jobs
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              For now, continue tracking payments manually in your quotes and jobs. 
              We'll notify you when these features are ready!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
