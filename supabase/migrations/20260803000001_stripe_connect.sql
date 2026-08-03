-- ============================================================================
-- Stripe Connect fields for multi-tenant checkout.
--
-- Each company connects their own Stripe Express account (they own the money;
-- QuotePro never touches the funds). We store the account id so we can create
-- Checkout Sessions on their behalf via the destination-charges pattern.
--
-- Invoices already have stripe_payment_intent_id + payment_link_url — we now
-- also record the Checkout Session id and cache the hosted URL.
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS companies_stripe_account_id_idx
  ON public.companies(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS invoices_stripe_session_idx
  ON public.invoices(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Convenience-fee toggle: when true, invoice viewer passes the card processing
-- fee back to the customer (~2.9% + $0.30). Bank / ACH still free to the payer.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS pass_card_fees BOOLEAN NOT NULL DEFAULT FALSE;
