'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { updateCompanySettings, type UpdateSettingsInput } from './actions'

// ---------------------------------------------------------------------------

export function SettingsForm({
  canEdit,
  initial,
}: {
  canEdit: boolean
  initial: UpdateSettingsInput
}) {
  const [values, setValues] = useState<UpdateSettingsInput>(initial)
  const [saving, startSave] = useTransition()

  function bind<K extends keyof UpdateSettingsInput>(key: K) {
    return {
      value: values[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        setValues((prev) => ({
          ...prev,
          [key]: key === 'tax_rate' ? Number(raw) : raw,
        }))
      },
    }
  }

  function submit() {
    startSave(async () => {
      const res = await updateCompanySettings(values)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Settings saved')
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Company name" required>
        <Input {...bind('name')} disabled={!canEdit} className="h-11 lg:h-10" />
      </Field>
      <Field label="Logo URL" hint="Public HTTPS URL for your logo">
        <Input {...bind('logo_url')} disabled={!canEdit} className="h-11 lg:h-10" placeholder="https://…" />
      </Field>
      <Field label="Phone">
        <Input {...bind('phone')} disabled={!canEdit} className="h-11 lg:h-10" placeholder="+1 (555) 000-0000" />
      </Field>
      <Field label="Email">
        <Input {...bind('email')} disabled={!canEdit} type="email" className="h-11 lg:h-10" placeholder="hello@company.com" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Business address">
          <Input {...bind('address')} disabled={!canEdit} className="h-11 lg:h-10" placeholder="123 Main St, City, State ZIP" />
        </Field>
      </div>
      <Field
        label="Timezone"
        hint="Sets what 'today' means on your dashboard and calendar"
      >
        <div className="flex gap-2">
          <select
            value={values.timezone}
            onChange={(e) => setValues((prev) => ({ ...prev, timezone: e.target.value }))}
            disabled={!canEdit}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm lg:h-10"
          >
            {TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
            {!TIMEZONES.some((z) => z.value === values.timezone) && (
              <option value={values.timezone}>{values.timezone}</option>
            )}
          </select>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 lg:h-10"
              onClick={() =>
                setValues((prev) => ({
                  ...prev,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }))
              }
            >
              Detect
            </Button>
          )}
        </div>
      </Field>
      <Field label="Default tax rate (%)" hint="Applied to new quotes; per-quote override still allowed">
        <Input
          type="number"
          step="0.01"
          value={values.tax_rate}
          onChange={(e) => setValues((prev) => ({ ...prev, tax_rate: Number(e.target.value) }))}
          disabled={!canEdit}
          className="h-11 tabular lg:h-10"
        />
      </Field>
      <div className="flex items-end justify-end">
        {canEdit ? (
          <Button onClick={submit} disabled={saving} className="h-11 gap-1.5 lg:h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground">
            Only owners/admins can edit these fields.
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

/**
 * The zones US trades businesses actually sit in, plus the device-detect
 * button beside the select for everyone else. The stored value is any valid
 * IANA zone; an off-list one renders as its own option rather than vanishing.
 */
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
]

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
