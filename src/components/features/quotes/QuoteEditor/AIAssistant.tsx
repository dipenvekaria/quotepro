'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Send, Wand2 } from 'lucide-react'

interface AIAssistantProps {
  quoteId?: string | null
  aiNotes?: string
  hasQuote?: boolean
  isGenerating?: boolean
  onGenerateQuote?: () => Promise<void>
  onUpdateWithAI: (prompt: string) => Promise<void>
  disabled?: boolean
}

export function AIAssistant({
  quoteId,
  aiNotes,
  hasQuote = false,
  isGenerating = false,
  onGenerateQuote,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      handleUpdate()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-[#0055FF]" />
        <span className="text-base font-semibold text-gray-900">AI Genie</span>
      </div>
      
      <div className="p-4">
        {/* No quote yet - Show generate button */}
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
              className="w-full min-h-[100px] px-4 py-3 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0055FF] focus:border-transparent resize-none"
              rows={4}
            />
            {/* Button row - full width on mobile, right-aligned on desktop */}
            <div className="flex justify-end">
              <button
                onClick={handleUpdate}
                disabled={!prompt.trim() || !quoteId || isUpdating || disabled}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Update Quote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
