'use client'

import { useRef, useState, useTransition } from 'react'
import { ArrowUp, Loader2, Zap } from 'lucide-react'

import { cn } from '@/lib/utils'

import { askBolt } from './actions'

/**
 * Bolt — ask about your business or how to do anything. Read-only by design:
 * it looks things up and points at the right screen; it never acts. Job-first
 * voice throughout, no AI branding beyond the name.
 */

type Msg = { role: 'user' | 'bolt'; text: string }

/** Just enough markdown for an assistant: bullets, bold, paragraphs. */
function BoltText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const isList = lines.every((l) => /^\s*[*•-]\s+/.test(l) || l.trim() === '')
        if (isList) {
          return (
            <ul key={bi} className="space-y-1 pl-4">
              {lines
                .filter((l) => l.trim())
                .map((l, li) => (
                  <li key={li} className="list-disc">
                    <Bold text={l.replace(/^\s*[*•-]\s+/, '')} />
                  </li>
                ))}
            </ul>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <Bold text={l.replace(/^\s*[*•-]\s+/, '• ')} />
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

const SUGGESTIONS = [
  'What does my day look like?',
  'How many quotes are waiting on customers?',
  'How do I set up repeating visits?',
  'Any overdue invoices?',
]

export function BoltChat() {
  const [thread, setThread] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, start] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setThread((t) => [...t, { role: 'user', text: message }])
    setInput('')
    start(async () => {
      const res = await askBolt({ message })
      setThread((t) => [
        ...t,
        {
          role: 'bolt',
          text: res.ok ? res.data.reply : res.error,
        },
      ])
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'nearest' }))
    })
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-border/70 px-5 py-3.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Ask Bolt</h2>
          <p className="text-xs text-muted-foreground">
            Your business and how-to questions. Bolt looks things up — it never changes anything.
          </p>
        </div>
      </header>

      <div className="max-h-96 space-y-3 overflow-y-auto p-4 sm:p-5">
        {thread.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                onClick={() => send(sug)}
                className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:border-primary/50 hover:bg-primary/5 lg:h-8"
              >
                {sug}
              </button>
            ))}
          </div>
        )}
        {thread.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'rounded-br-md bg-primary text-primary-foreground'
                  : 'rounded-bl-md bg-muted/60 text-foreground',
              )}
            >
              {m.role === 'bolt' ? <BoltText text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted/60 px-3.5 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-border/70 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            aria-label="Ask Bolt"
            className="h-12 w-full rounded-full border border-input bg-background pl-4 pr-12 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className={cn(
              'absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full transition-all',
              input.trim() && !busy
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground/50',
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  )
}
