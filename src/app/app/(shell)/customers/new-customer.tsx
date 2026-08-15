'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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

import { createCustomer } from './actions'

/**
 * Add a customer without writing a quote first.
 *
 * Quoting stays the common path — that is why customers appear there
 * automatically — but a contractor who has just come off a call needs somewhere
 * to put a name and number before they forget it.
 */
export function NewCustomer({ variant = 'default' }: { variant?: 'default' | 'outline' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, startSave] = useTransition()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

  function set(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function submit() {
    startSave(async () => {
      const res = await createCustomer(form)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`${form.name.trim()} added`)
      setOpen(false)
      setForm({ name: '', email: '', phone: '', address: '' })
      router.refresh()
    })
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add customer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a customer</DialogTitle>
            <DialogDescription>
              You can quote them straight away, or leave the details here for later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-cust-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-cust-name"
                autoFocus
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Sarah Johnson"
                className="h-11"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-cust-phone">Phone</Label>
                <Input
                  id="new-cust-phone"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-11"
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-cust-email">Email</Label>
                <Input
                  id="new-cust-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="sarah@example.com"
                  className="h-11"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-cust-address">Address</Label>
              <Input
                id="new-cust-address"
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder="123 Market St, San Francisco, CA 94103"
                className="h-11"
                disabled={saving}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              A phone number or email lets Rivet recognise them next time you quote, instead of
              creating a second record.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Add customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
