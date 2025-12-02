// @ts-nocheck - Supabase type generation pending
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DEFAULT_PRICING_ITEMS } from '@/lib/default-pricing'

export function useOnboarding() {
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

    // NEW SCHEMA: Check users table for company_id
    const { data: userRecord } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userRecord?.company_id) {
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

      // NEW SCHEMA: Create company first (no user_id column)
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          logo_url: logoUrl,
        })
        .select()
        .single()

      if (companyError) {
        console.error('Company creation error:', companyError)
        throw companyError
      }

      // NEW SCHEMA: Create user record linking to company
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          company_id: newCompany.id,
          role: 'owner'
        })

      if (userError) {
        console.error('User record creation error:', userError)
        throw userError
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
    router.push('/dashboard')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const progress = (step / 2) * 100

  return {
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
  }
}
