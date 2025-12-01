// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserRole } from '@/hooks/use-user-role'
import { hasPermission } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Wrench, Building2, Package, FileText, User, CreditCard, Users } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard-nav'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CompanyProfileSettings } from '@/components/features/settings/CompanyProfileSettings'
import { PricingItemsManager } from '@/components/features/settings/PricingItemsManager'
import { QuoteDefaultsSettings } from '@/components/features/settings/QuoteDefaultsSettings'
import { TeamMemberManager } from '@/components/features/settings/TeamMemberManager'
import { AccountSettings } from '@/components/features/settings/AccountSettings'
import { SubscriptionSettings } from '@/components/features/settings/SubscriptionSettings'

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role, loading: roleLoading } = useUserRole()
  const supabase = createClient()
  
  // All state hooks MUST be at the top before any conditional returns
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [pricingItems, setPricingItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Account settings
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Company settings
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  
  // Quote settings
  const [defaultTerms, setDefaultTerms] = useState('')
  const [defaultNotes, setDefaultNotes] = useState('')
  const [defaultValidDays, setDefaultValidDays] = useState('30')
  
  // Team management
  const [teamMembers, setTeamMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('sales')
  const [isInviting, setIsInviting] = useState(false)
  
  // New pricing item
  const [newPricingItem, setNewPricingItem] = useState({ name: '', price: '', category: 'Labor', description: '' })
  const [editingItem, setEditingItem] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  
  // Bulk upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace')
  
  // Column mapping state
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [filePreview, setFilePreview] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<any>({})
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  
  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Active tab state - read from URL or default to 'company'
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'company'
  })
  
  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    window.history.pushState({}, '', url)
  }
  
  // Sync tab from URL on mount and when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams, activeTab])
  
  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!roleLoading && !hasPermission(role, 'VIEW_SETTINGS')) {
      toast.error('You do not have permission to access settings')
      router.push('/dashboard')
    }
  }, [role, roleLoading, router])
  
  // Load user data on mount - don't wait for role check
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        
        setUser(user)
        setEmail(user.email)

        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (companyData) {
          setCompany(companyData)
          setCompanyName(companyData.name || '')
          setCompanyPhone(companyData.phone || '')
          setCompanyEmail(companyData.email || '')
          setCompanyAddress(companyData.address || '')
          setLogoPreview(companyData.logo_url)
          setDefaultTerms(companyData.default_terms || '')
          setDefaultNotes(companyData.default_notes || '')
          setDefaultValidDays(companyData.default_valid_days || '30')
        }

        const { data: pricing, error: pricingError } = await supabase
          .from('pricing_items')
          .select('*')
          .eq('company_id', companyData.id)
          .order('category', { ascending: true })
          .order('name', { ascending: true })

        setPricingItems(pricing || [])
        
        // Load team members
        const { data: members } = await supabase
          .from('team_members')
          .select(`
            *,
            user:user_id (
              email,
              raw_user_meta_data
            )
          `)
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: false })
        
        setTeamMembers(members || [])
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [])
  
  // Show page immediately - redirect happens in background if needed
  // Don't block rendering on role check

  // Reusable function to reload all user data
  const reloadUserData = async () => {
    console.log('🔄 Starting reloadUserData...')
    setIsLoading(true)
    try {
      console.log('🔐 Getting user from Supabase auth...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 User result:', { hasUser: !!user, userId: user?.id })
      
      if (!user) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }
      
      setUser(user)
      setEmail(user.email)

      console.log('🏢 Querying company data...')
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('🏢 Company query:', {
        userId: user.id,
        companyId: companyData?.id,
        hasCompany: !!companyData,
        error: companyError
      })

      if (companyData) {
        setCompany(companyData)
        setCompanyName(companyData.name || '')
        setCompanyPhone(companyData.phone || '')
        setCompanyEmail(companyData.email || '')
        setCompanyAddress(companyData.address || '')
        setLogoPreview(companyData.logo_url)
        setDefaultTerms(companyData.default_terms || '')
        setDefaultNotes(companyData.default_notes || '')
        setDefaultValidDays(companyData.default_valid_days || '30')
      }

      const { data: pricing, error: pricingError } = await supabase
        .from('pricing_items')
        .select('*')
        .eq('company_id', companyData.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      console.log('📊 Pricing items query:', { 
        companyId: companyData.id, 
        count: pricing?.length || 0,
        error: pricingError,
        sample: pricing?.[0]
      })

      setPricingItems(pricing || [])
      
      // Load team members
      const { data: members } = await supabase
        .from('team_members')
        .select(`
          *,
          user:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false })
      
      setTeamMembers(members || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCompanyUpdate = async () => {
    setIsSaving(true)
    try {
      let logoUrl = company.logo_url

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

      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName,
          phone: companyPhone,
          email: companyEmail,
          address: companyAddress,
          logo_url: logoUrl,
        })
        .eq('id', company.id)

      if (error) throw error
      toast.success('Company information updated')
      rereloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuoteSettingsUpdate = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          default_terms: defaultTerms,
          default_notes: defaultNotes,
          default_valid_days: defaultValidDays,
        })
        .eq('id', company.id)

      if (error) throw error
      toast.success('Quote settings updated')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPricingItem = async () => {
    if (!newPricingItem.name || !newPricingItem.price) {
      toast.error('Please enter name and price')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('pricing_items')
        .insert({
          company_id: company.id,
          name: newPricingItem.name,
          description: newPricingItem.description || null,
          price: parseFloat(newPricingItem.price),
          category: newPricingItem.category,
          is_default: false,
        })

      if (error) throw error
      toast.success('Pricing item added')
      setNewPricingItem({ name: '', price: '', category: 'Labor', description: '' })
      reloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdatePricingItem = async (item) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('pricing_items')
        .update({
          name: item.name,
          description: item.description || null,
          price: parseFloat(item.price),
          category: item.category,
        })
        .eq('id', item.id)

      if (error) throw error
      toast.success('Pricing item updated')
      setEditingItem(null)
      reloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePricingItem = async (itemId) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('pricing_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      toast.success('Pricing item deleted')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      reloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Team management functions
  const handleInviteTeamMember = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    setIsInviting(true)
    try {
      // First, check if user exists in auth.users (you'll need to create a Supabase Edge Function for this)
      // For now, we'll create a placeholder that requires the user to sign up first
      
      // In a production app, you'd:
      // 1. Send an email invitation
      // 2. Create a pending invitation record
      // 3. When they sign up, link them to the company
      
      // For this demo, we'll just show a message
      toast.info('Team invitations will be available after email integration is set up')
      setInviteEmail('')
      
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateMemberRole = async (memberId, newRole) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      toast.success('Role updated successfully')
      reloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveTeamMember = async (memberId) => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      toast.success('Team member removed')
      reloadUserData()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }
  
  // Bulk upload handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
        return
      }
      setUploadFile(file)
      
      // Automatically preview the file
      await handlePreviewFile(file)
    }
  }
  
  const handlePreviewFile = async (file: File) => {
    setIsLoadingPreview(true)
    try {
      console.log('📁 Previewing file:', file.name, file.type, file.size)
      
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('🚀 Sending preview request via Next.js API...')
      const response = await fetch('/api/pricing/preview', {
        method: 'POST',
        body: formData,
      })
      
      console.log('📊 Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        
        let errorMessage = 'Failed to preview file'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('✅ Preview data received:', data)
      
      // Set preview data and suggested mapping
      setFilePreview(data)
      setColumnMapping(data.suggested_mapping)
      setShowMappingDialog(true)
      
    } catch (error: any) {
      console.error('❌ Preview error:', error)
      
      // Better error messages
      let errorMessage = 'Failed to preview file'
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Cannot connect to backend server. Is it running on port 8000?'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoadingPreview(false)
    }
  }
  
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload')
      return
    }
    
    if (!company?.id) {
      toast.error('Company ID not found')
      return
    }
    
    // Validate required mappings
    if (!columnMapping.name || !columnMapping.price) {
      toast.error('Please map at least Name and Price columns')
      return
    }
    
    setIsUploading(true)
    setShowMappingDialog(false)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('company_id', company.id)
      formData.append('column_mapping', JSON.stringify(columnMapping))
      
      const endpoint = uploadMode === 'replace' 
        ? '/api/pricing/bulk-upload'
        : '/api/pricing/bulk-append'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail?.message || data.detail || 'Upload failed')
      }
      
      toast.success(`Successfully uploaded ${data.items_count} items!`)
      setUploadFile(null)
      setFilePreview(null)
      setColumnMapping({})
      
      // Reload pricing items
      await reloadUserData()
      
      // Force a small delay to ensure UI updates
      setTimeout(() => {
        toast.success(`${data.items_count} items now visible in catalog below`)
      }, 500)
      
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload pricing items')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleDownloadTemplate = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(`http://localhost:8000/api/pricing/download-template?format=${format}`)
      
      if (!response.ok) {
        throw new Error('Failed to download template')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'pricing_template.csv' : 'pricing_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Template downloaded successfully`)
    } catch (error: any) {
      console.error('Download error:', error)
      toast.error('Failed to download template')
    }
  }

  // Filter pricing items based on search and category
  const filteredPricingItems = pricingItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const groupedPricingItems = filteredPricingItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})
  
  // Get unique categories for filter dropdown
  const allCategories = [...new Set(pricingItems.map(item => item.category))].sort()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  const navItems = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'quotes', label: 'Quote Settings', icon: FileText },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'account', label: 'Account', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:flex overflow-x-hidden">
      {/* Main Navigation - Desktop only */}
      <div className="hidden lg:block">
        <DashboardNav />
      </div>

      {/* Settings Content */}
      <div className="flex-1 min-w-0">
        {/* Header with mobile menu */}
        <header className="bg-[#0F172A] border-b border-white/10 sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <DashboardNav buttonOnly />
              <div className="bg-[#FF6200] p-2 rounded-lg">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-300 text-sm">Manage your preferences</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[88px] z-10 overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <nav className="flex gap-1 min-w-min px-4 sm:px-6 lg:px-8" aria-label="Settings tabs">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`
                      flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors flex-shrink-0
                      ${isActive 
                        ? 'border-[#FF6200] text-[#FF6200]' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline sm:inline">{item.label}</span>
                    <span className="xs:hidden sm:hidden">
                      {item.id === 'company' && 'Company'}
                      {item.id === 'products' && 'Products'}
                      {item.id === 'quotes' && 'Quotes'}
                      {item.id === 'team' && 'Team'}
                      {item.id === 'account' && 'Account'}
                      {item.id === 'subscription' && 'Plan'}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
          {/* Company Profile */}
          {activeTab === 'company' && (
            <CompanyProfileSettings
              companyName={companyName}
              setCompanyName={setCompanyName}
              companyPhone={companyPhone}
              setCompanyPhone={setCompanyPhone}
              companyEmail={companyEmail}
              setCompanyEmail={setCompanyEmail}
              companyAddress={companyAddress}
              setCompanyAddress={setCompanyAddress}
              logoPreview={logoPreview}
              onLogoChange={handleLogoChange}
              isSaving={isSaving}
              onSave={handleCompanyUpdate}
            />
          )}

          {/* Products & Services Tab */}
          {activeTab === 'products' && (
            <PricingItemsManager
              pricingItems={pricingItems}
              newPricingItem={newPricingItem}
              setNewPricingItem={setNewPricingItem}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              uploadMode={uploadMode}
              setUploadMode={setUploadMode}
              uploadFile={uploadFile}
              isLoadingPreview={isLoadingPreview}
              isUploading={isUploading}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              isSaving={isSaving}
              onAddItem={handleAddPricingItem}
              onFileSelect={handleFileSelect}
              onUpdateItem={handleUpdatePricingItem}
              onDeleteItem={(item) => {
                setItemToDelete(item)
                setDeleteDialogOpen(true)
              }}
              onDownloadTemplate={handleDownloadTemplate}
            />
          )}

          {/* Quote Settings Tab */}
          {activeTab === 'quotes' && (
            <QuoteDefaultsSettings
              defaultTerms={defaultTerms}
              setDefaultTerms={setDefaultTerms}
              defaultNotes={defaultNotes}
              setDefaultNotes={setDefaultNotes}
              defaultValidDays={defaultValidDays}
              setDefaultValidDays={setDefaultValidDays}
              isSaving={isSaving}
              onSave={handleQuoteSettingsUpdate}
            />
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <AccountSettings
              email={email}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              isSaving={isSaving}
              onPasswordChange={handlePasswordChange}
              onSignOut={handleSignOut}
            />
          )}

          {/* Team Members Tab */}
          {activeTab === 'team' && (
            <TeamMemberManager
              teamMembers={teamMembers}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              isInviting={isInviting}
              isSaving={isSaving}
              onInvite={handleInviteTeamMember}
              onUpdateRole={handleUpdateMemberRole}
              onRemove={handleRemoveTeamMember}
            />
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <SubscriptionSettings />
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pricing Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setItemToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeletePricingItem(itemToDelete.id)}
                disabled={isSaving}
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Column Mapping Dialog */}
        <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Map Your Columns</DialogTitle>
              <DialogDescription>
                {filePreview && (
                  <>
                    Found {filePreview.total_rows} rows in "{filePreview.filename}". 
                    Map your file columns to our database fields below.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {filePreview && (
              <div className="space-y-6">
                {/* Column Mapping */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Column Mapping</h3>
                  
                  {/* Name Mapping */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label>Item Name (Required)</Label>
                    <Select 
                      value={columnMapping.name || ''} 
                      onValueChange={(value) => setColumnMapping({...columnMapping, name: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for name..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filePreview.columns.map((col: string) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Mapping */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label>Price (Required)</Label>
                    <Select 
                      value={columnMapping.price || ''} 
                      onValueChange={(value) => setColumnMapping({...columnMapping, price: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for price..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filePreview.columns.map((col: string) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Mapping */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label>Category (Optional)</Label>
                    <Select 
                      value={columnMapping.category || '__none__'} 
                      onValueChange={(value) => setColumnMapping({...columnMapping, category: value === '__none__' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Skip this field --</SelectItem>
                        {filePreview.columns.map((col: string) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description Mapping */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <Label>Description (Optional)</Label>
                    <Select 
                      value={columnMapping.description || '__none__'} 
                      onValueChange={(value) => setColumnMapping({...columnMapping, description: value === '__none__' ? null : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column for description..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Skip this field --</SelectItem>
                        {filePreview.columns.map((col: string) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Data Preview */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Data Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          {filePreview.columns.map((col: string) => (
                            <th key={col} className="px-3 py-2 text-left font-medium">
                              {col}
                              {col === columnMapping.name && ' → Name'}
                              {col === columnMapping.price && ' → Price'}
                              {col === columnMapping.category && ' → Category'}
                              {col === columnMapping.description && ' → Description'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filePreview.preview_data.map((row: any, idx: number) => (
                          <tr key={idx} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                            {filePreview.columns.map((col: string) => (
                              <td key={col} className="px-3 py-2">
                                {String(row[col] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Validation Warning */}
                {(!columnMapping.name || !columnMapping.price) && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Please map at least the <strong>Name</strong> and <strong>Price</strong> columns to continue.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMappingDialog(false)
                  setUploadFile(null)
                  setFilePreview(null)
                  setColumnMapping({})
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!columnMapping.name || !columnMapping.price || isUploading}
                className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
              >
                {isUploading ? 'Uploading...' : `Upload ${filePreview?.total_rows || 0} Items`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
