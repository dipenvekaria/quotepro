'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle, X, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CompleteJobModalProps {
  quote: any
  onClose: () => void
  onComplete: () => void
}

export function CompleteJobModal({ quote, onClose, onComplete }: CompleteJobModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 192 // h-48 = 12rem = 192px
    
    // Detect dark mode and set appropriate stroke color
    const isDarkMode = document.documentElement.classList.contains('dark')
    
    // Set drawing styles - white for dark mode, black for light mode
    ctx.strokeStyle = isDarkMode ? '#fff' : '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Re-detect theme on each draw to handle theme changes
    const isDarkMode = document.documentElement.classList.contains('dark')
    ctx.strokeStyle = isDarkMode ? '#fff' : '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleComplete = async () => {
    if (!hasSignature) {
      toast.error('Customer signature is required')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Get signature as data URL
      const canvas = canvasRef.current
      const signatureData = canvas?.toDataURL('image/png')

      const response = await fetch(`/api/quotes/${quote.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          customer_signature: signatureData,
          user_id: user?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to complete job')

      toast.success('Job marked as complete!')
      onComplete()
    } catch (error) {
      console.error('Error completing job:', error)
      toast.error('Failed to complete job. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Info */}
          <div className="bg-muted rounded-lg p-4">
            <p className="font-bold mb-1">{quote.customer_name}</p>
            {quote.job_name && (
              <p className="text-sm text-muted-foreground">{quote.job_name}</p>
            )}
            <p className="text-sm font-bold mt-2 text-primary">
              ${quote.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Customer Signature *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
              <canvas
                ref={canvasRef}
                className="w-full h-48 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-muted-foreground">
                    Sign here with your finger or mouse
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              By signing above, the customer acknowledges that the work has been completed to their satisfaction.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={isSubmitting || !hasSignature}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Processing...' : 'Complete Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
