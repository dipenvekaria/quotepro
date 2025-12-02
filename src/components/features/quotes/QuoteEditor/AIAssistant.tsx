'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'

interface AIAssistantProps {
  quoteId?: string | null
  aiNotes?: string
  onUpdateWithAI: (prompt: string) => Promise<void>
  disabled?: boolean
}

export function AIAssistant({
  quoteId,
  aiNotes,
  onUpdateWithAI,
  disabled = false,
}: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    if (!prompt.trim() || disabled) return

    setIsUpdating(true)
    try {
      await onUpdateWithAI(prompt)
      setPrompt('')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className="border-purple-500 border-2">
      <CardHeader className="bg-purple-500/5">
        <CardTitle className="flex items-center gap-2 text-purple-600">
          <Bot className="h-5 w-5" />
          AI Quote Assistant
        </CardTitle>
        <CardDescription>
          Ask AI to modify the quote - add items, change quantities, adjust prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiNotes && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-sm font-bold mb-2 flex items-center gap-2">
              📋 Installation Instructions / Job Description
            </div>
            <div className="text-sm whitespace-pre-wrap">{aiNotes}</div>
          </div>
        )}

        <div className="space-y-3">
          <Label htmlFor="aiUpdatePrompt" className="text-sm">
            What would you like to change?
          </Label>
          <Textarea
            id="aiUpdatePrompt"
            placeholder='e.g., "Add a $50 trip charge" or "Increase labor quantity to 8 hours" or "Add 20% markup to all materials"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleUpdate}
          disabled={!prompt.trim() || !quoteId || isUpdating || disabled}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating Quote...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              Update Quote with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
