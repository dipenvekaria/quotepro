// @ts-nocheck - Supabase type generation pending
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/hooks/useOnboarding'

export default function OnboardingPage() {
  const {
    step,
    companyName,
    setCompanyName,
    logoPreview,
    isLoading,
    progress,
    handleLogoChange,
    handleStep1,
    handleStep2,
    handleLogout
  } = useOnboarding()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0F172A] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-sm font-bold text-white">QuoteBuilder Pro</h1>
                <p className="text-[#2563eb] text-sm font-bold">
                  Stop losing jobs to slow quotes.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="text-center mb-8">
            <Progress value={progress} className="h-2 mb-4" />
            <p className="text-muted-foreground">Step {step} of 2</p>
          </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What's your company name?</CardTitle>
              <CardDescription>
                This will appear on all your quotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., CoolAir HVAC Services"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-12 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo (optional)</Label>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="logo"
                    className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-accent transition-colors"
                  >
                    <span>Upload Logo</span>
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  {logoPreview && (
                    <div className="h-16 w-16 border rounded-lg overflow-hidden">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleStep1}
                disabled={isLoading}
                className="w-full h-12 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
              >
                {isLoading ? 'Saving...' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
              </div>
              <CardTitle className="text-center text-sm">
                You're ready to go!
              </CardTitle>
              <CardDescription className="text-center text-sm">
                Create your first quote and start winning more jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
                <h3 className="font-bold text-primary">What's next?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Create your first quote in under 60 seconds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Use AI to generate professional line items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Send via SMS and get signatures in minutes</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleStep2}
                className="w-full h-14 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white text-sm font-bold"
              >
                Create Your First Quote Now
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  )
}
