'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings as SettingsIcon, User, Building2, Bell, CreditCard } from 'lucide-react'

interface SettingsContentProps {
  companyId: string
}

export function SettingsContent({ companyId }: SettingsContentProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-sm font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your company and account preferences
        </p>
      </div>

      {/* Coming Soon Message */}
      <Card className="border-2 border-[#2563eb]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#2563eb]/10 rounded-full">
              <SettingsIcon className="h-8 w-8 text-[#2563eb]" />
            </div>
            <div>
              <CardTitle className="text-sm">Settings Coming Soon</CardTitle>
              <CardDescription className="text-sm mt-1">
                We're building comprehensive settings and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            The Settings section will give you complete control over your The Field Genie experience:
          </p>

          {/* Upcoming Features */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <Building2 className="h-5 w-5 text-[#2563eb] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold mb-1">Company Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Update company info, logo, and business details
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <User className="h-5 w-5 text-[#2563eb] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold mb-1">User Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your account, password, and personal preferences
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <Bell className="h-5 w-5 text-[#2563eb] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Configure email and push notification preferences
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-lg border bg-card">
              <CreditCard className="h-5 w-5 text-[#2563eb] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold mb-1">Billing & Plans</h3>
                <p className="text-sm text-muted-foreground">
                  Manage subscription, billing, and payment methods
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              For now, contact support if you need to update any settings. 
              We'll notify you when these features are available!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
