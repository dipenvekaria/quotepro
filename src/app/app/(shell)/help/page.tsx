import Link from 'next/link'
import {
  ArrowRight,
  BookText,
  CalendarClock,
  FileText,
  FileUp,
  Sparkles,
  Wallet,
} from 'lucide-react'

import { requireSession } from '@/lib/auth/session'
import { PageContainer, PageHeader } from '@/components/shared/page'

import { BoltChat } from './bolt-chat'

export const metadata = { title: 'Help' }

/**
 * Task-based help — six short answers to "how do I…", each ending at the
 * screen where the work happens. No tour overlay on purpose: contractors
 * skip walkthroughs, and copy that lives where the task lives teaches at
 * the moment of need. Support is reply-to-any-email; no ticket system to
 * learn.
 */

const TOPICS = [
  {
    icon: Sparkles,
    title: 'Draft a quote',
    body: 'Open a new quote and describe the job in plain words. The line items come from your own price book at your own prices. If the description is too vague to price, you get a question with tappable answers instead of a guess.',
    href: '/app/quotes/new',
    cta: 'New quote',
  },
  {
    icon: FileText,
    title: 'Send it and get it signed',
    body: 'Send emails your customer a link — no login, no app on their side. They review the lines and your terms, type their name to approve, and the acceptance is recorded with the exact terms they agreed to. Pull it up any time from the job’s Acceptance record.',
    href: '/app/pipeline',
    cta: 'Pipeline',
  },
  {
    icon: CalendarClock,
    title: 'Schedule the job',
    body: 'A won quote becomes a job with one tap, and because every price book item carries labour hours, the calendar knows how long jobs really take. Repeating work gets a repeat rule and schedules itself.',
    href: '/app/calendar',
    cta: 'Calendar',
  },
  {
    icon: Wallet,
    title: 'Invoice and get paid',
    body: 'Convert the finished job to an invoice and send it; your customer pays online through your own Stripe account. Record cash or check payments by hand — everything lands in the same place either way.',
    href: '/app/pipeline',
    cta: 'Pipeline',
  },
  {
    icon: BookText,
    title: 'Keep the books current',
    body: 'Connect QuickBooks Online once, and every invoice and payment posts itself — real items, tax as a proper liability line, totals matching to the cent. Nothing to export at month end.',
    href: '/app/integrations',
    cta: 'Integrations',
  },
  {
    icon: FileUp,
    title: 'Bring your data over',
    body: 'Switching from Jobber, Housecall Pro, or Joist? The import wizard walks you to their export button and takes the file from there. Your price book imports from a CSV — or from a photo of an old quote or rate sheet.',
    href: '/app/import',
    cta: 'Import',
  },
]

export default async function HelpPage() {
  await requireSession()
  return (
    <PageContainer>
      <PageHeader
        title="Help"
        description="Six answers that cover most days. Anything else — reply to any email from Rivet and a human reads it."
      />
      <div className="mt-6 max-w-4xl">
        <BoltChat />
      </div>
      <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <section
            key={t.title}
            className="flex flex-col rounded-xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-muted">
                <t.icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">{t.title}</h2>
            </div>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            <Link
              href={t.href}
              className="mt-3 inline-flex h-11 w-fit items-center gap-1 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted lg:h-8"
            >
              {t.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}
