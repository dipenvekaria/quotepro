'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SubscriptionSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & Billing</CardTitle>
        <CardDescription>
          Manage your subscription plan and billing details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-6 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="font-bold text-sm text-green-900">
              Free Trial
            </p>
            <p className="text-sm text-green-700 mt-1">
              14 days remaining • Unlimited quotes
            </p>
          </div>
          <Link href="/pricing">
            <Button className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white">
              Upgrade Plan
            </Button>
          </Link>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold mb-4">Available Plans</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h4 className="font-bold text-base">Starter</h4>
              <p className="text-base font-bold my-2">$99<span className="text-sm font-medium text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground mb-4">Perfect for small businesses</p>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">View Details</Button>
              </Link>
            </div>
            <div className="border rounded-lg p-4 border-[#2563eb]">
              <h4 className="font-bold text-base">Pro</h4>
              <p className="text-base font-bold my-2">$199<span className="text-sm font-medium text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground mb-4">For growing businesses</p>
              <Link href="/pricing">
                <Button className="w-full bg-[#2563eb] hover:bg-[#2563eb]/90 text-white">View Details</Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
