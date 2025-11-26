// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { DEFAULT_PRICING_ITEMS } from '@/lib/default-pricing'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [companyName, setCompanyName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkExistingCompany()
  }, [])

  const checkExistingCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (company) {
      router.push('/dashboard')
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleStep1 = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter your company name')
      return
    }

    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let logoUrl = null
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName)

        logoUrl = publicUrl
      }

      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: companyName,
          logo_url: logoUrl,
        })
        .select()
        .single()

      if (error) {
        console.error('Company creation error:', error)
        throw error
      }

      console.log('Company created successfully:', newCompany)
      
      // Add default pricing items automatically
      if (newCompany) {
        const pricingItems = DEFAULT_PRICING_ITEMS.map(item => ({
          company_id: newCompany.id,
          name: item.name,
          price: item.price,
          category: item.category,
          is_default: true,
        }))

        await supabase
          .from('pricing_items')
          .insert(pricingItems)
      }
      
      setStep(2)
    } catch (error: unknown) {
      const err = error as { message: string }
      console.error('Step 1 error:', err)
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep2 = async () => {
    // Step 2 is now just the completion step, go directly to dashboard
    router.push('/dashboard')
  }

  const progress = (step / 2) * 100

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-[#0F172A] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">QuoteBuilder Pro</h1>
              <p className="text-[#FF6200] text-sm font-semibold">
                Stop losing jobs to slow quotes.
              </p>
            </div>
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
                  className="h-12 text-lg"
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
                className="w-full h-12 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
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
                <div className="h-20 w-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-4xl">
                  ✓
                </div>
              </div>
              <CardTitle className="text-center text-2xl">
                You're ready to go!
              </CardTitle>
              <CardDescription className="text-center text-lg">
                Create your first quote and start winning more jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
                <h3 className="font-semibold text-primary">What's next?</h3>
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
                className="w-full h-14 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white text-lg font-semibold"
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
