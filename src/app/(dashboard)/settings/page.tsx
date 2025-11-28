// @ts-nocheck - Supabase type generation pending
'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserRole } from '@/hooks/use-user-role'
import { hasPermission } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Wrench, Building2, Package, FileText, User, CreditCard, Users, Upload, Download, Search, Filter, X } from 'lucide-react'
import { DashboardNav } from '@/components/dashboard-nav'
import { ExpandableSearch } from '@/components/expandable-search'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>
                  Update your company information that appears on quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contact@yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="123 Main St, City, State, ZIP"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="logo"
                      className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FF6200] transition-colors"
                    >
                      <span>Upload New Logo</span>
                    </label>
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    {logoPreview && (
                      <div className="h-20 w-20 border rounded-lg overflow-hidden">
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
                  onClick={handleCompanyUpdate}
                  disabled={isSaving}
                  className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Company Info'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Products & Services Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Pricing Item</CardTitle>
                  <CardDescription>
                    Add items to your pricing catalog for quick quote generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="itemName">Item Name</Label>
                      <Input
                        id="itemName"
                        value={newPricingItem.name}
                        onChange={(e) => setNewPricingItem({ ...newPricingItem, name: e.target.value })}
                        placeholder="e.g., HVAC Unit Installation"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemPrice">Price ($)</Label>
                      <Input
                        id="itemPrice"
                        type="number"
                        step="0.01"
                        value={newPricingItem.price}
                        onChange={(e) => setNewPricingItem({ ...newPricingItem, price: e.target.value })}
                        placeholder="299.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemCategory">Category</Label>
                      <select
                        id="itemCategory"
                        value={newPricingItem.category}
                        onChange={(e) => setNewPricingItem({ ...newPricingItem, category: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="Labor">Labor</option>
                        <option value="Materials">Materials</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Permits">Permits</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="itemDescription">Description (optional)</Label>
                    <Textarea
                      id="itemDescription"
                      value={newPricingItem.description}
                      onChange={(e) => setNewPricingItem({ ...newPricingItem, description: e.target.value })}
                      placeholder="Add details to help AI generate better quotes..."
                      className="w-full resize-none"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleAddPricingItem}
                    disabled={isSaving}
                    className="mt-4 bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                  >
                    {isSaving ? 'Adding...' : 'Add Item'}
                  </Button>
                </CardContent>
              </Card>

              {/* Bulk Upload Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Upload Pricing Items</CardTitle>
                  <CardDescription>
                    Upload CSV or Excel files with any column names - we'll help you map them!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Mode Selection */}
                  <div className="space-y-2">
                    <Label>Upload Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={uploadMode === 'replace' ? 'default' : 'outline'}
                        onClick={() => setUploadMode('replace')}
                        className={uploadMode === 'replace' ? 'bg-[#FF6200] hover:bg-[#FF6200]/90' : ''}
                      >
                        � Replace All
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMode === 'append' ? 'default' : 'outline'}
                        onClick={() => setUploadMode('append')}
                        className={uploadMode === 'append' ? 'bg-[#FF6200] hover:bg-[#FF6200]/90' : ''}
                      >
                        ➕ Add to Existing
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {uploadMode === 'replace' 
                        ? '⚠️ Replace All: Deletes all existing items and uploads new ones'
                        : '✅ Add to Existing: Keeps current items and adds new ones from file'}
                    </p>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="bulkUpload">Select Your File</Label>
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="bulkUpload"
                        className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-[#FF6200] transition-colors flex-1 bg-gray-50 dark:bg-gray-800"
                      >
                        {uploadFile ? (
                          <span className="text-sm font-medium">
                            📎 {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                          </span>
                        ) : (
                          <span className="text-sm">📁 Click to select CSV or Excel file</span>
                        )}
                      </label>
                      <input
                        id="bulkUpload"
                        type="file"
                        accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports: CSV (.csv), Excel (.xlsx, .xls) • Any column names work!
                    </p>
                  </div>

                  {/* Loading State */}
                  {isLoadingPreview && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">📊 Analyzing your file...</p>
                    </div>
                  )}

                  {/* Uploading State */}
                  {isUploading && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">⬆️ Uploading items...</p>
                    </div>
                  )}

                  {/* Feature Highlights */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <span className="text-lg">✨</span> Smart Column Mapping
                    </h4>
                    <ul className="text-xs space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                        <span><strong>Upload any file</strong> - Works with QuickBooks, ServiceTitan, Excel, Google Sheets exports</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                        <span><strong>Auto-detection</strong> - We automatically detect your column headers and suggest mappings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                        <span><strong>Visual preview</strong> - See first 5 rows before uploading to verify your data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                        <span><strong>Map your columns</strong> - Simply match your columns to: Name, Price, Category, Description</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                        <span className="italic">No templates needed - use your existing files!</span>
                      </li>
                    </ul>
                  </div>

                  {/* Optional: Templates for those who want them */}
                  <details className="mt-4">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      📥 Need a sample file? Download template (optional)
                    </summary>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTemplate('csv')}
                        className="flex-1"
                      >
                        📄 CSV Template
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTemplate('excel')}
                        className="flex-1"
                      >
                        📊 Excel Template
                      </Button>
                    </div>
                  </details>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Your Pricing Catalog
                          <Badge variant="secondary">{pricingItems.length} total</Badge>
                          {filteredPricingItems.length !== pricingItems.length && (
                            <Badge variant="outline">{filteredPricingItems.length} shown</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Search and manage your pricing items by category
                        </CardDescription>
                      </div>
                    </div>
                    
                    {/* Search and Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <ExpandableSearch
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by name or description..."
                        className="flex-1"
                      />
                      
                      <div className="sm:w-64">
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4" />
                              <SelectValue placeholder="All Categories" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {allCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {pricingItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No pricing items yet</p>
                      <p className="text-sm text-muted-foreground">Add items manually below or bulk upload from a file</p>
                    </div>
                  ) : filteredPricingItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No items match your filters</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedCategory('all')
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6">
                      {Object.entries(groupedPricingItems).map(([category, items]) => (
                        <div key={category}>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                            {category}
                            <Badge variant="secondary">{items.length}</Badge>
                          </h3>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4"
                              >
                                {editingItem?.id === item.id ? (
                                  <div className="flex-1 space-y-3">
                                    <div className="grid md:grid-cols-2 gap-3">
                                      <Input
                                        value={editingItem.name}
                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        placeholder="Item name"
                                        className="w-full"
                                      />
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={editingItem.price}
                                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                        placeholder="Price"
                                        className="w-full"
                                      />
                                    </div>
                                    <Textarea
                                      value={editingItem.description || ''}
                                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                      placeholder="Description (optional) - helps AI generate better quotes"
                                      className="w-full resize-none"
                                      rows={2}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdatePricingItem(editingItem)}
                                        disabled={isSaving}
                                        className="bg-[#FF6200] hover:bg-[#FF6200]/90 flex-1"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        ${parseFloat(item.price).toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingItem({ ...item })}
                                        className="flex-1 md:flex-none"
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                          setItemToDelete(item)
                                          setDeleteDialogOpen(true)
                                        }}
                                        className="flex-1 md:flex-none"
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quote Settings Tab */}
          {activeTab === 'quotes' && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Defaults</CardTitle>
                <CardDescription>
                  Set default terms, notes, and settings for all new quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultTerms">Default Terms & Conditions</Label>
                  <Textarea
                    id="defaultTerms"
                    value={defaultTerms}
                    onChange={(e) => setDefaultTerms(e.target.value)}
                    placeholder="Payment due within 30 days. 50% deposit required to start work..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    These terms will automatically appear on all new quotes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultNotes">Default Notes</Label>
                  <Textarea
                    id="defaultNotes"
                    value={defaultNotes}
                    onChange={(e) => setDefaultNotes(e.target.value)}
                    placeholder="Thank you for your business! Call us with any questions..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional notes that will appear on quotes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validDays">Quote Valid For (days)</Label>
                  <Input
                    id="validDays"
                    type="number"
                    value={defaultValidDays}
                    onChange={(e) => setDefaultValidDays(e.target.value)}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many days quotes remain valid for acceptance
                  </p>
                </div>

                <Button
                  onClick={handleQuoteSettingsUpdate}
                  disabled={isSaving}
                  className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Quote Settings'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Manage your login credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={email} disabled className="bg-gray-100 dark:bg-gray-800" />
                    <p className="text-xs text-muted-foreground">
                      Contact support to change your email address
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>

                      <Button
                        onClick={handlePasswordChange}
                        disabled={isSaving || !newPassword || !confirmPassword}
                        className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
                      >
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription>
                    Account actions that cannot be undone
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Team Members Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Invite team members and manage their roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Invite New Member */}
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-semibold">Invite Team Member</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-40">
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales Team</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleInviteTeamMember}
                        disabled={isInviting || !inviteEmail}
                        className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white whitespace-nowrap"
                      >
                        {isInviting ? 'Inviting...' : 'Send Invite'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Team members will receive an email invitation to join your company
                    </p>
                  </div>

                  {/* Current Team Members */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Current Team Members</h3>
                    {teamMembers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No team members yet</p>
                        <p className="text-sm">Invite your first team member to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {member.user?.raw_user_meta_data?.full_name || member.user?.email}
                              </p>
                              <p className="text-sm text-gray-500">{member.user?.email}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => handleUpdateMemberRole(member.id, newRole)}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-purple-500">Admin</Badge>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="sales">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-blue-500">Sales</Badge>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveTeamMember(member.id)}
                                disabled={isSaving}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role Permissions Info */}
                  <div className="border-t pt-6 space-y-4">
                    <h3 className="font-semibold">Role Permissions</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-500">Admin</Badge>
                        </div>
                        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                          <li>• Full access to settings</li>
                          <li>• Manage team members</li>
                          <li>• Edit company profile</li>
                          <li>• Manage pricing & products</li>
                          <li>• Create & edit quotes</li>
                          <li>• Manage subscription</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-500">Sales Team</Badge>
                        </div>
                        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                          <li>• Create new quotes</li>
                          <li>• Edit existing quotes</li>
                          <li>• Send quotes to customers</li>
                          <li>• View all company quotes</li>
                          <li className="text-gray-400">• No access to settings</li>
                          <li className="text-gray-400">• Cannot manage team</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>
                  Manage your subscription plan and billing details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-lg text-green-900 dark:text-green-100">
                      Free Trial
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      14 days remaining • Unlimited quotes
                    </p>
                  </div>
                  <Link href="/pricing">
                    <Button className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white">
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg">Starter</h4>
                      <p className="text-3xl font-bold my-2">$99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                      <p className="text-sm text-muted-foreground mb-4">Perfect for small businesses</p>
                      <Link href="/pricing">
                        <Button variant="outline" className="w-full">View Details</Button>
                      </Link>
                    </div>
                    <div className="border rounded-lg p-4 border-[#FF6200]">
                      <h4 className="font-semibold text-lg">Pro</h4>
                      <p className="text-3xl font-bold my-2">$199<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                      <p className="text-sm text-muted-foreground mb-4">For growing businesses</p>
                      <Link href="/pricing">
                        <Button className="w-full bg-[#FF6200] hover:bg-[#FF6200]/90 text-white">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
