import Link from 'next/link'
import {
  ArrowRight,
  BookText,
  CalendarClock,
  Check,
  FileText,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RivetMark } from '@/components/brand/logo'
import { WaitlistForm } from './waitlist-form'

/**
 * The public homepage — the one page a stranger ever reads.
 *
 * Static server component on purpose: no client JS, nothing to hydrate,
 * loads instantly on a phone in a parking lot. Every claim on it is true of
 * the shipped product today — including call answering, which is live. Monochrome per the design identity — restraint reads as
 * expensive, and every competitor's page is orange and busy.
 */

const SOLO_FEATURES = [
  'AI quotes drafted from your own price book',
  'Quotes → invoices → payments, one record',
  'Customer-facing quote links that close jobs',
  'Automated review requests',
  'Recurring visits with auto-invoicing',
  'QuickBooks Online bookkeeping sync',
  'AI call answering, 100 min/mo included',
]

const CREW_FEATURES = [
  'Everything in Team',
  'Dispatch across multiple crews',
  'Per-crew boards and workload',
  'Priority support',
]

const TEAM_FEATURES = [
  'Everything in Solo',
  'AI call answering, 300 min/mo included',
  'Calendar dispatch that knows job length',
  'Team workload at a glance',
  'Roles: owner, office, technician',
  'Internal notes with @mentions',
  'Unlimited teammates',
]

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

function PriceCard({
  name,
  price,
  blurb,
  features,
  highlight,
  comingSoon,
}: {
  name: string
  price: string
  blurb: string
  features: string[]
  highlight?: boolean
  comingSoon?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? 'flex flex-col rounded-2xl border-2 border-primary bg-card p-7 shadow-card'
          : 'flex flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-sm'
      }
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        {highlight && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
            For crews
          </span>
        )}
        {comingSoon && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Coming soon
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-semibold tabular tracking-tight">{price}</span>
        {!comingSoon && <span className="text-sm text-muted-foreground">/month</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span className={f.endsWith('coming soon') ? 'text-muted-foreground' : undefined}>
              {f}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      {comingSoon ? (
        <p className="mt-6 flex h-11 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Announced at launch
        </p>
      ) : (
        <Button asChild className="mt-6 h-11 w-full">
          <Link href="#early-access">Get early access</Link>
        </Button>
      )}
    </div>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <RivetMark className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Rivet</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="h-11">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-11">
            <Link href="#early-access">
              Get early access
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main>
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          For every trade that quotes from a price book
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Quote the job before the other guy calls back.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Describe the job. Rivet drafts the quote from <em>your own price book</em> in
          seconds — your items, your prices, never invented ones. The customer accepts on
          their phone, the job lands on the calendar, the invoice sends itself, and the
          books stay current. One record, first call to cash.
        </p>
        <div id="early-access" className="mt-8 flex w-full flex-col items-center gap-3">
          <WaitlistForm source="hero" />
          <span className="text-sm text-muted-foreground">
            Invite-only while we finish. 14-day free trial at launch — everything included,
            no add-ons, ever.
          </span>
        </div>
      </section>

      {/* The one-record story */}
      <section className="border-y border-border/70 bg-muted/40" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          What Rivet does
        </h2>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <Feature icon={Sparkles} title="Quotes that write themselves">
            Describe the job in plain words and get real line items at your real prices.
            Vague job? It asks the right question instead of guessing. Nothing in your
            price book is ever substituted or made up.
          </Feature>
          <Feature icon={FileText} title="A quote link customers trust">
            No login, no app. Your customer opens a clean page with your name on it,
            reviews the price, and accepts with one tap — from the couch, the same evening.
          </Feature>
          <Feature icon={CalendarClock} title="A calendar that knows job length">
            Every price book item carries labour hours, so an accepted quote knows how long
            it takes. Scheduling shows who actually has room — not just who has a blank
            square.
          </Feature>
          <Feature icon={RefreshCw} title="Repeat work on autopilot">
            Weekly clean, monthly maintenance — set it once. Each visit becomes its own
            scheduled job, and the invoice emails itself if you want it to.
          </Feature>
          <Feature icon={Star} title="Reviews, asked at the right moment">
            One tap on a finished job emails the customer your Google and Facebook review
            links while the good work is fresh.
          </Feature>
          <Feature icon={Wallet} title="Books that keep themselves">
            Invoices and payments post straight into QuickBooks Online — items, tax, and
            all. Your accountant stops asking for spreadsheets.
          </Feature>
        </div>
      </section>

      {/* The promises, plainly. His words: no gimmicks — we value your time. */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 text-center sm:grid-cols-3">
          <div>
            <p className="text-base font-semibold">No add-ons. Ever.</p>
            <p className="mt-1 text-sm text-muted-foreground">One price per size — nothing gated, nothing upsold.</p>
          </div>
          <div>
            <p className="text-base font-semibold">No spam.</p>
            <p className="mt-1 text-sm text-muted-foreground">A few emails that matter. Your customers&rsquo; inboxes are treated the same.</p>
          </div>
          <div>
            <p className="text-base font-semibold">No lock-in.</p>
            <p className="mt-1 text-sm text-muted-foreground">Your data exports any time. We keep it clean because we value your time.</p>
          </div>
        </div>
      </section>

      {/* Answering — sold honestly */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-card p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                AI call answering
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                  coming soon
                </span>
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Most callers who hit voicemail never call back. Rivet will answer the calls
                you miss, take the job details, and drop a ready-to-quote lead in your
                pipeline — included in the price when it ships, like everything else.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/70 bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Two plans today. Everything in both.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            No add-ons, no plan gates, no per-feature upsells. The tools the big platforms
            sell as $99&ndash;$500 monthly extras are simply included.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <PriceCard
              name="Solo"
              price="$49"
              blurb="For owner-operators. Everything for one person."
              features={SOLO_FEATURES}
            />
            <PriceCard
              name="Team"
              price="$99"
              blurb="For shops with a crew. Everything, for everyone."
              features={TEAM_FEATURES}
              highlight
            />
            <PriceCard
              name="Crew"
              price="—"
              blurb="For shops running several crews at once."
              features={CREW_FEATURES}
              comingSoon
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            14-day free trial on both. Your price book imports from a CSV or a photo of an
            old quote.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Fair questions</h2>
        <dl className="mt-6 space-y-6">
          <div>
            <dt className="font-medium">Do I have to rebuild my price book?</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              No. Import a CSV, or photograph an old quote or rate sheet and the AI
              extracts the items. Your prices stay yours to edit, always.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Will the AI make up prices?</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              It can&rsquo;t. Quotes are built only from items in your price book. When a
              job needs something you haven&rsquo;t priced, it says so and asks — it never
              invents a number a customer could hold you to.
            </dd>
          </div>
          <div>
            <dt className="font-medium">What does my customer see?</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              A clean page with your company name, the line items, and one button to
              accept. No account, no app, no Rivet branding shouting over yours.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Is my data mine?</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Yes. Your customers, prices, and history belong to you, and QuickBooks sync
              means your books never live only in Rivet.
            </dd>
          </div>
        </dl>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            The next call that comes in, quote it in a minute.
          </h2>
          <WaitlistForm source="footer" />
        </div>
      </section>

      {/* Footer — a real one. Only links that resolve; no socials until they
          exist, no mailto until the domain sends mail. */}
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <RivetMark className="h-4 w-4" />
                </div>
                <span className="text-base font-semibold">Rivet</span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Quote to cash for field service. Everything included, no add-ons — for
                every trade that quotes from a price book.
              </p>
            </div>
            <nav aria-label="Product">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="#pricing" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Pricing</Link></li>
                <li><Link href="#early-access" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Get early access</Link></li>
                <li><Link href="/login" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Sign in</Link></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/privacy" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Privacy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Terms</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Rivet. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Structured data: the product and the honest FAQ, for search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Rivet',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'AI quoting, scheduling, invoicing, and payments for trade businesses. Quotes drafted from your own price book in seconds.',
            offers: [
              { '@type': 'Offer', name: 'Solo', price: '49', priceCurrency: 'USD' },
              { '@type': 'Offer', name: 'Team', price: '99', priceCurrency: 'USD' },
            ],
            url: 'https://getrivet.ai',
          }),
        }}
      />
    </div>
  )
}
