#!/usr/bin/env python3
"""
Script to refactor settings page by replacing inline sections with extracted components.
Runs in one pass to avoid partial state issues.
"""

import re

# Read the original file
with open('src/app/(dashboard)/settings/page.tsx', 'r') as f:
    content = f.read()

# 1. Update imports - add component imports, remove unused UI imports
old_imports = """import { Button } from '@/components/ui/button'
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
} from "@/components/ui/dialog\""""

new_imports = """import { Button } from '@/components/ui/button'
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
import { SubscriptionSettings } from '@/components/features/settings/SubscriptionSettings'"""

content = content.replace(old_imports, new_imports)

# 2. Replace Company Profile tab section
company_pattern = r"(          {/\* Company Profile \*/}\n          {activeTab === 'company' && \(\n            <Card>.*?</Card>\n          \)\})"
company_replacement = """          {/* Company Profile */}
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
          )}"""

content = re.sub(company_pattern, company_replacement, content, flags=re.DOTALL)

# 3. Replace Products & Services tab section (this is the biggest one)
products_pattern = r"(          {/\* Products & Services Tab \*/}\n          {activeTab === 'products' && \(\n            <div className=\"space-y-6\">.*?            </div>\n          \)\})"
products_replacement = """          {/* Products & Services Tab */}
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
          )}"""

content = re.sub(products_pattern, products_replacement, content, flags=re.DOTALL)

# 4. Replace Quote Settings tab
quotes_pattern = r"(          {/\* Quote Settings Tab \*/}\n          {activeTab === 'quotes' && \(\n            <Card>.*?</Card>\n          \)\})"
quotes_replacement = """          {/* Quote Settings Tab */}
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
          )}"""

content = re.sub(quotes_pattern, quotes_replacement, content, flags=re.DOTALL)

# 5. Replace Account tab
account_pattern = r"(          {/\* Account Tab \*/}\n          {activeTab === 'account' && \(\n            <div className=\"space-y-6\">.*?            </div>\n          \)\})"
account_replacement = """          {/* Account Tab */}
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
          )}"""

content = re.sub(account_pattern, account_replacement, content, flags=re.DOTALL)

# 6. Replace Team Members tab
team_pattern = r"(          {/\* Team Members Tab \*/}\n          {activeTab === 'team' && \(\n            <div className=\"space-y-6\">.*?            </div>\n          \)\})"
team_replacement = """          {/* Team Members Tab */}
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
          )}"""

content = re.sub(team_pattern, team_replacement, content, flags=re.DOTALL)

# 7. Replace Subscription tab
subscription_pattern = r"(          {/\* Subscription Tab \*/}\n          {activeTab === 'subscription' && \(\n            <Card>.*?</Card>\n          \)\})"
subscription_replacement = """          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <SubscriptionSettings />
          )}"""

content = re.sub(subscription_pattern, subscription_replacement, content, flags=re.DOTALL)

# Write the refactored file
with open('src/app/(dashboard)/settings/page.tsx', 'w') as f:
    f.write(content)

print("✅ Settings page refactored successfully!")
print("📊 Check file size with: wc -l src/app/(dashboard)/settings/page.tsx")
