'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-[#0F172A] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2">
                <img 
                  src="/thefieldgenie.png" 
                  alt="The Field Genie" 
                  className="h-14 w-auto object-contain"
                />
                <p className="text-[#2563eb] text-xs sm:text-sm font-bold">
                  Stop losing jobs to slow quotes.
                </p>
              </div>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 h-10 px-4 text-sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-sm sm:text-sm font-bold text-white mb-3 sm:mb-4">
            Close Jobs Faster
          </h2>
          <p className="text-sm sm:text-sm text-gray-300 mb-4 sm:mb-6">
            Choose the plan that fits your business
          </p>
          <div className="inline-block bg-[#2563eb] text-white px-4 py-2 rounded-lg font-bold text-sm sm:text-sm">
            30 quotes free trial
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-12 sm:mb-16">
          {/* Starter Plan */}
          <Card className="border-2 border-gray-700 bg-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm sm:text-sm font-bold text-white mb-2">Starter</CardTitle>
              <CardDescription className="text-gray-400 text-sm sm:text-sm">
                Everything you need for 1–2 trucks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm sm:text-sm font-bold text-white">$99</span>
                  <span className="text-gray-400 text-sm sm:text-sm">/month</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#2563eb] font-bold text-sm sm:text-sm">$79/mo</span>
                  <span className="text-gray-400 text-sm">billed annually</span>
                  <Badge className="bg-green-600 text-white text-xs">Save 20%</Badge>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 sm:space-y-3 pt-4 border-t border-gray-700">
                <div className="text-gray-300 text-sm sm:text-sm">✓ 30 quotes per month</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ 1 user</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ Quote generation</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ SMS sending</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ E-signature integration</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ Email support</div>
              </div>

              <Link href="/login" className="block">
                <Button className="w-full h-12 sm:h-14 text-sm sm:text-sm font-bold bg-white text-gray-900 hover:bg-gray-100">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-4 border-[#2563eb] bg-gray-800 relative">
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-[#2563eb] text-white px-3 sm:px-6 py-1 sm:py-2 text-xs sm:text-sm font-bold">
              74% CHOOSE THIS
            </div>

            <CardHeader className="pt-10 sm:pt-12 pb-4">
              <CardTitle className="text-sm sm:text-sm font-bold text-white mb-2">Pro</CardTitle>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-[#2563eb] text-white text-xs">Most popular</Badge>
                <Badge className="bg-green-600 text-white text-xs">Best for contractors</Badge>
              </div>
              <CardDescription className="text-gray-300 text-sm sm:text-sm">
                Best for contractors who write 10+ quotes/week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm sm:text-sm font-bold text-white">$199</span>
                  <span className="text-gray-400 text-sm sm:text-sm">/month</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#2563eb] font-bold text-sm sm:text-sm">$149/mo</span>
                  <span className="text-gray-400 text-sm">billed annually</span>
                  <Badge className="bg-green-600 text-white text-xs">Save 25%</Badge>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 sm:space-y-3 pt-4 border-t border-gray-700">
                <div className="text-white font-bold text-sm sm:text-sm">✓ Unlimited quotes</div>
                <div className="text-white font-bold text-sm sm:text-sm">✓ Unlimited users</div>
                <div className="text-white font-bold text-sm sm:text-sm">✓ Priority support</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ Quote generation</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ SMS sending</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ E-signature integration</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ Custom branding</div>
                <div className="text-gray-300 text-sm sm:text-sm">✓ Advanced analytics</div>
              </div>

              <Link href="/login" className="block">
                <Button className="w-full h-12 sm:h-14 text-sm sm:text-sm font-bold bg-[#2563eb] hover:bg-[#2563eb]/90 text-white">
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="bg-[#0F172A] rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto border border-white/10">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm sm:text-sm">14-day free trial</h3>
              <p className="text-gray-400 text-xs sm:text-sm">(no card required)</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm sm:text-sm">Cancel anytime</h3>
              <p className="text-gray-400 text-xs sm:text-sm">or downgrade anytime</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-white font-bold text-sm sm:text-sm">Money-back guarantee</h3>
              <p className="text-gray-400 text-xs sm:text-sm">if you don't win an extra job in 30 days</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12 sm:mt-16">
          <h3 className="text-sm sm:text-sm font-bold text-white mb-3 sm:mb-4">
            Ready to close more jobs?
          </h3>
          <p className="text-sm sm:text-sm text-gray-300 mb-6 sm:mb-8">
            Join thousands of contractors winning more work
          </p>
          <Link href="/login">
            <Button className="h-14 sm:h-16 px-8 sm:px-12 text-sm sm:text-sm font-bold bg-[#2563eb] hover:bg-[#2563eb]/90 text-white">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F172A] border-t border-white/10 mt-16 sm:mt-24 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400 text-sm">
            <p>&copy; 2025 The Field Genie. All rights reserved.</p>
            <p className="mt-2">Built for contractors who want to close jobs faster.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
