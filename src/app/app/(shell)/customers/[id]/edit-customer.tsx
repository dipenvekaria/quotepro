'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddressAutocomplete } from '@/components/shared/address-autocomplete'

import { updateCustomer } from '../actions'

/**
 * Correcting a customer's details.
 *
 * A phone number written down wrong over a noisy line used to be permanent, and
 * the quote attached to it silently went nowhere. This is the smallest thing
 * that fixes that.
 */
export function EditCustomer({
  customer,
}: {
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, startSave] = useTransition()
  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
    zip: customer.zip ?? '',
  })

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  function save() {
    startSave(async () => {
      const res = await updateCustomer({ id: customer.id, ...form })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Customer updated')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>
              Changes apply everywhere this customer appears. Quotes already sent keep the details
              they were sent with.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="sarah@example.com"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <AddressAutocomplete
                id="edit-address"
                value={form.address}
                onChange={(address) => set({ address, city: '', state: '', zip: '' })}
                onResolved={(a) =>
                  set({ address: a.address, city: a.city, state: a.state, zip: a.zip })
                }
                disabled={saving}
              />
              {form.city && form.state && (
                <p className="text-xs text-muted-foreground">
                  {form.city}, {form.state} {form.zip}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
