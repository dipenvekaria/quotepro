'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Archive } from 'lucide-react'

interface ArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  title?: string
  description?: string
  itemType?: 'lead' | 'quote'
}

export function ArchiveDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemType = 'lead',
}: ArchiveDialogProps) {
  const [reason, setReason] = useState('')
  const [isArchiving, setIsArchiving] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) return
    
    setIsArchiving(true)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onOpenChange(false)
    } catch (error) {
      console.error('Archive failed:', error)
    } finally {
      setIsArchiving(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-blue-500" />
            {title || `Archive ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`}
          </DialogTitle>
          <DialogDescription>
            {description || `Please provide a reason for archiving this ${itemType}. This will be recorded in the audit trail.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="archive-reason">Reason for archiving *</Label>
            <Textarea
              id="archive-reason"
              placeholder={`e.g., Customer not responding, Job cancelled, Duplicate ${itemType}...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isArchiving}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isArchiving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={!reason.trim() || isArchiving}
            className="bg-blue-500 hover:bg-blue-700"
          >
            {isArchiving ? (
              <>
                <Archive className="mr-2 h-4 w-4 animate-pulse" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
