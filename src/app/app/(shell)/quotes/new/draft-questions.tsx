'use client'

import { AlertTriangle, HelpCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * What the draft could not decide, and what it could not cover.
 *
 * Before this, an ambiguous description produced a confident guess and a job
 * the price book could not do produced a plausible quote anyway — six to twelve
 * lines and up to $5,950 for work the business does not sell. Both failures
 * looked exactly like a normal draft, which is what made them dangerous.
 *
 * Answering a question appends it to the job description and drafts again,
 * rather than patching line items directly. The description is the thing the
 * contractor already trusts and edits, and it is what the next draft reads, so
 * the answer survives instead of living in hidden state.
 */
export function DraftQuestions({
  questions,
  unmet,
  onAnswer,
  disabled,
}: {
  questions: { question: string; options: string[] }[]
  unmet: string[]
  onAnswer: (question: string, option: string) => void
  disabled?: boolean
}) {
  if (questions.length === 0 && unmet.length === 0) return null

  return (
    <div className="space-y-3 border-b border-border/70 px-5 py-4">
      {questions.map((q) => (
        <div key={q.question}>
          <p className="flex items-start gap-2 text-sm font-medium">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {q.question}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 pl-6">
            {q.options.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onAnswer(q.question, opt)}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium',
                  'hover:border-primary hover:bg-primary/5 disabled:opacity-50 lg:min-h-0 lg:py-1.5',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {unmet.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold">Not in your price book</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {unmet.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-muted-foreground">
              Left off the quote rather than substituted. Add it to your price book, or price it by
              hand below.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
