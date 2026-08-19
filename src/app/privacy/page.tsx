import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Rivet collects, why, and your choices.',
  alternates: { canonical: '/privacy' },
}

/** Plain-language privacy policy. Counsel review before launch (GTM §legal). */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Rivet</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated August 18, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>What we collect</h2>
          <p>
            Account details you give us (name, email, company info), the business data
            you put into Rivet (customers, price book, quotes, invoices, photos, notes),
            and technical basics needed to run the service (log data, device and browser
            information, IP addresses — including on quote acceptances, where the IP
            forms part of the signature record).
          </p>
        </section>
        <section>
          <h2>How we use it</h2>
          <p>
            To run the product: drafting quotes from your price book, sending documents
            to your customers on your behalf, syncing your books when you connect
            QuickBooks, processing payments through your Stripe account, and improving
            reliability. AI features process your data to produce drafts for you; your
            data is not used to train third-party foundation models.
          </p>
        </section>
        <section>
          <h2>Who processes it</h2>
          <p>
            Infrastructure and subprocessors we use to provide the service: Vercel
            (hosting), Supabase (database, authentication, file storage), Google (AI
            drafting, sign-in), Resend (email delivery), Stripe (payments, if you
            connect it), and Intuit (QuickBooks sync, if you connect it). Each receives
            only what their function requires.
          </p>
        </section>
        <section>
          <h2>Your customers&rsquo; data</h2>
          <p>
            The customer records you store in Rivet belong to your business; we process
            them on your instructions and never sell them or market to your customers.
          </p>
        </section>
        <section>
          <h2>Cookies</h2>
          <p>
            We use cookies for signing you in and keeping your session — no advertising
            trackers, no third-party analytics cookies.
          </p>
        </section>
        <section>
          <h2>Retention and deletion</h2>
          <p>
            Your data stays while your account is active. If you delete your account,
            company data is archived and then removed from live systems; backups age
            out on a fixed schedule. You can export your data at any time from Settings.
          </p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>
            You can access, correct, export, or delete your data. Depending on where
            you live you may have additional statutory rights; requests via any email
            from us are honoured to the extent the law provides.
          </p>
        </section>
        <section>
          <h2>Changes</h2>
          <p>Material changes will be announced in the product or by email before they take effect.</p>
        </section>
      </div>
    </main>
  )
}
