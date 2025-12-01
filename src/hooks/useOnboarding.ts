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
    router.push('/dashboard')
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
    handleStep2
  }
}
