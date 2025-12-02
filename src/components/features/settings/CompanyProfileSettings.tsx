'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CompanyProfileSettingsProps {
  companyName: string
  companyPhone: string
  companyEmail: string
  companyAddress: string
  logoPreview: string | null
  onCompanyNameChange: (value: string) => void
  onCompanyPhoneChange: (value: string) => void
  onCompanyEmailChange: (value: string) => void
  onCompanyAddressChange: (value: string) => void
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSave: () => Promise<void>
}

export function CompanyProfileSettings({
  companyName,
  companyPhone,
  companyEmail,
  companyAddress,
  logoPreview,
  onCompanyNameChange,
  onCompanyPhoneChange,
  onCompanyEmailChange,
  onCompanyAddressChange,
  onLogoChange,
  onSave,
}: CompanyProfileSettingsProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }

  return (
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
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Your Company Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyPhone">Phone Number</Label>
          <Input
            id="companyPhone"
            type="tel"
            value={companyPhone}
            onChange={(e) => onCompanyPhoneChange(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyEmail">Company Email</Label>
          <Input
            id="companyEmail"
            type="email"
            value={companyEmail}
            onChange={(e) => onCompanyEmailChange(e.target.value)}
            placeholder="contact@yourcompany.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyAddress">Company Address</Label>
          <Textarea
            id="companyAddress"
            value={companyAddress}
            onChange={(e) => onCompanyAddressChange(e.target.value)}
            placeholder="123 Main St, City, State, ZIP"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Company Logo</Label>
          <div className="flex items-center gap-4">
            <label
              htmlFor="logo"
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2563eb] transition-colors"
            >
              <span>Upload New Logo</span>
            </label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={onLogoChange}
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
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white"
        >
          {isSaving ? 'Saving...' : 'Save Company Info'}
        </Button>
      </CardContent>
    </Card>
  )
}
