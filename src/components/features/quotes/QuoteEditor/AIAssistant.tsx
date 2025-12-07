'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Send, Wand2, Bot } from 'lucide-react'

interface AIAssistantProps {
  quoteId?: string | null
  aiNotes?: string
  hasQuote?: boolean
  isGenerating?: boolean
  onGenerateQuote?: () => Promise<void>
  onUpdateWithAI: (prompt: string) => Promise<void>
  onOpenChat: () => void
  disabled?: boolean
}

export function AIAssistant({
  quoteId,
  aiNotes,
  hasQuote = false,
  isGenerating = false,
  onGenerateQuote,
  onUpdateWithAI,
  onOpenChat,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      handleUpdate()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-[#0055FF]" />
        <span className="text-base font-semibold text-gray-900">AI Genie</span>
      </div>
      
      {/* Body */}
      <div className="p-4 space-y-4">
        {/* No quote yet - Show big generate button */}
        {!hasQuote && onGenerateQuote && (
          <Button
            onClick={onGenerateQuote}
            disabled={isGenerating || disabled}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-purple-500/25"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Quote...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Initial Quote from Job Description
              </>
            )}
          </Button>
        )}

        {/* Has quote - Show modification input */}
        {hasQuote && (
          <div className="space-y-3">
            <textarea
              placeholder="Ask AI Genie to modify your quote... e.g. 'Add a 10% discount' or 'Remove labor costs'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating || !prompt.trim() || disabled}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Update Quote</span>
              </Button>
              <Button
                onClick={onOpenChat}
                disabled={disabled}
                variant="outline"
                className="h-10"
              >
                <Bot className="h-4 w-4 mr-2" />
                Chat Assistant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
