'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface QuoteDefaultsSettingsProps {
  defaultTerms: string
  setDefaultTerms: (terms: string) => void
  defaultNotes: string
  setDefaultNotes: (notes: string) => void
  defaultValidDays: string
  setDefaultValidDays: (days: string) => void
  isSaving: boolean
  onSave: () => void
}

export function QuoteDefaultsSettings({
  defaultTerms,
  setDefaultTerms,
  defaultNotes,
  setDefaultNotes,
  defaultValidDays,
  setDefaultValidDays,
  isSaving,
  onSave,
}: QuoteDefaultsSettingsProps) {
  return (
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
          onClick={onSave}
          disabled={isSaving}
          className="bg-[#FF6200] hover:bg-[#FF6200]/90 text-white"
        >
          {isSaving ? 'Saving...' : 'Save Quote Settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
