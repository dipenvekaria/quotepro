// @ts-nocheck
'use client'

import { useState, useRef, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, ArrowLeft, Pencil, Loader2 } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default function CompleteJobPage({ params }: Props) {
  const { id: jobId } = use(params)
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadJob() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quotes')
        .select('*, customers(*)')
        .eq('id', jobId)
        .single()
      
      if (error || !data) {
        toast.error('Job not found')
        router.push('/work')
        return
      }
      
      setJob(data)
      setLoading(false)
    }
    loadJob()
  }, [jobId, router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || loading) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [loading])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleComplete = async () => {
    if (!hasSignature) {
      toast.error('Please provide a signature')
      return
    }

    setIsSubmitting(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas not found')
      
      const signatureDataUrl = canvas.toDataURL('image/png')
      const supabase = createClient()
      
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          completed_at: new Date().toISOString(),
          customer_signature: signatureDataUrl,
          status: 'completed'
        })
        .eq('id', jobId)
      
      if (updateError) throw updateError

      const { data: { user } } = await supabase.auth.getUser()
      if (user && job) {
        await supabase.from('activity_log').insert({
          company_id: job.company_id,
          user_id: user.id,
          entity_type: 'quote',
          entity_id: jobId,
          action: 'job_completed',
          description: 'Job completed with customer signature',
        })
      }

      toast.success('Job completed! Invoice will be sent.')
      router.push('/work')
    } catch (err) {
      console.error('Error completing job:', err)
      toast.error('Failed to complete job')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Complete Job</h1>
              <p className="text-sm text-gray-600">{job?.customers?.name || 'Customer'}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-bold">{job?.job_name || 'Job'}</h3>
              {job?.description && (
                <p className="text-sm text-gray-600">{job.description}</p>
              )}
              <div className="text-xl font-bold text-blue-600">
                ${job?.total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Customer Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                className="w-full h-48 touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Sign above to confirm job completion
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSignature}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleComplete}
          disabled={!hasSignature || isSubmitting}
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Complete & Send Invoice
            </>
          )}
        </Button>

        <p className="text-center text-xs text-gray-500">
          An invoice with payment link will be sent to the customer automatically.
        </p>
      </main>
    </div>
  )
}
