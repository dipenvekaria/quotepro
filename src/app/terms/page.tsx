import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern use of Rivet.',
  alternates: { canonical: '/terms' },
}

/**
 * Standard SaaS terms, deliberately plain. Drafted as a reasonable baseline —
 * counsel should review before money changes hands (GTM checklist §legal).
 */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Rivet</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated August 18, 2026</p>

      <div className="prose-sm mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>1. The service</h2>
          <p>
            Rivet is software for running a field-service business: quoting, scheduling,
            invoicing, payments, and related tools (&ldquo;the Service&rdquo;), provided by Rivet
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service you agree to these
            terms on behalf of yourself and, if applicable, the business you represent.
          </p>
        </section>
        <section>
          <h2>2. Accounts</h2>
          <p>
            You are responsible for your account credentials and for activity under your
            account, including teammates you invite. Keep your information accurate. You
            must be at least 18 and able to form a binding contract.
          </p>
        </section>
        <section>
          <h2>3. Your content and data</h2>
          <p>
            Your customers, price book, quotes, invoices, and files remain yours. You
            grant us the rights needed to operate the Service on your behalf — storing,
            processing, transmitting, and displaying your content to you, your team, and
            the customers you send documents to. You can export your data at any time.
          </p>
        </section>
        <section>
          <h2>4. Acceptable use</h2>
          <p>
            Don&rsquo;t use the Service to break the law, to send spam, to infringe
            others&rsquo; rights, to probe or disrupt the Service, or to misrepresent who
            you are to your customers. We may suspend accounts that do.
          </p>
        </section>
        <section>
          <h2>5. AI-assisted features</h2>
          <p>
            Some features draft content — quotes, summaries, suggestions — automatically
            from your own data. You are responsible for reviewing anything before you
            send it to a customer. Prices on quotes come from your price book; verify
            them before sending.
          </p>
        </section>
        <section>
          <h2>6. Fees and trials</h2>
          <p>
            Paid plans are billed monthly at the prices shown when you subscribe, after
            any free trial. Payment processing on invoices you send runs through your
            own payment provider account and their fees are theirs. We may change prices
            with at least 30 days&rsquo; notice; changes never apply retroactively.
          </p>
        </section>
        <section>
          <h2>7. Third-party services</h2>
          <p>
            The Service connects to third parties you choose — for example Stripe for
            payments and QuickBooks Online for bookkeeping. Their terms govern your use
            of their services; we are not responsible for them.
          </p>
        </section>
        <section>
          <h2>8. Disclaimer and limitation of liability</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind.
            To the maximum extent permitted by law, we are not liable for indirect,
            incidental, special, or consequential damages, or lost profits, and our
            total liability for any claim is limited to the amounts you paid us in the
            twelve months before the claim.
          </p>
        </section>
        <section>
          <h2>9. Termination</h2>
          <p>
            You can cancel at any time; your data remains exportable for 30 days after
            cancellation. We may suspend or terminate accounts that violate these terms.
          </p>
        </section>
        <section>
          <h2>10. Changes</h2>
          <p>
            We may update these terms; material changes will be notified in the product
            or by email at least 14 days before they take effect. Continued use after
            that is acceptance.
          </p>
        </section>
        <section>
          <h2>11. Contact</h2>
          <p>Questions about these terms: reply to any email from us, or write to the address on your invoice.</p>
        </section>
      </div>
    </main>
  )
}
