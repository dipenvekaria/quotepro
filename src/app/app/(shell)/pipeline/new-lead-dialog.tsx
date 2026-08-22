'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PhoneIncoming, Plus } from 'lucide-react'
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

import { createLead } from './lead-actions'

/**
 * The phone-rings entry point: name and problem, saved in seconds. The quote
 * comes later — separating capture from quoting is the point.
 */
export function NewLeadDialog({ trigger = 'default' }: { trigger?: 'default' | 'column' }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [saving, start] = useTransition()

  function save() {
    start(async () => {
      const res = await createLead({
        customer_name: name,
        customer_phone: phone || undefined,
        description: note || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOpen(false)
      setName('')
      setPhone('')
      setNote('')
      toast.success('Lead saved')
      router.push(`/app/pipeline/${res.data.id}`)
    })
  }

  return (
    <>
      {trigger === 'column' ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Add a lead"
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-primary lg:min-h-0"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)} className="h-11 gap-1.5 lg:h-9">
          <PhoneIncoming className="h-3.5 w-3.5" />
          New lead
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
            <DialogDescription>
              Just the call — name, number, what they need. Quote it when you&apos;re ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">Name</Label>
              <Input
                id="lead-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Who called"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-note">What they need</Label>
              <textarea
                id="lead-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Water heater making noise, wants someone this week…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="h-11 lg:h-9">
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()} className="h-11 gap-1.5 lg:h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
