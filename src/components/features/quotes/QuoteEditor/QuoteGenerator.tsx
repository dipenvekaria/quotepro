'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'

interface QuoteGeneratorProps {
  onGenerate: (prompt: string) => Promise<void>
  disabled?: boolean
}

export function QuoteGenerator({ onGenerate, disabled = false }: QuoteGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim() || disabled) return

    setIsGenerating(true)
    try {
      await onGenerate(prompt)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-blue-500 border-2">
      <CardHeader className="bg-blue-500/5">
        <CardTitle className="flex items-center gap-2 text-blue-600">
          <Bot className="h-5 w-5" />
          Generate Quote with AI
        </CardTitle>
        <CardDescription>
          Describe what you want to quote for this job and AI will generate line items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="aiPrompt" className="text-sm">
            What should be included in the quote?
          </Label>
          <Textarea
            id="aiPrompt"
            placeholder='e.g., "Install new HVAC system with 3-ton unit, ductwork, thermostat, and labor" or "Roof repair - replace 200 sq ft of shingles, fix flashing around chimney"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] text-sm p-4"
          />
          <p className="text-sm text-muted-foreground">
            💡 Be specific about materials, quantities, and labor. The AI will break this into individual line items with prices.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating || disabled}
          className="w-full h-14 text-sm font-bold bg-blue-500 hover:bg-blue-700 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Quote...
            </>
          ) : (
            <>
              <Bot className="h-5 w-5 mr-2" />
              Generate Quote with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
