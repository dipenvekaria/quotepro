-- ============================================================================
-- Contractor-applied promotions
-- ============================================================================
-- "Fall promotion — service call is $9.99 instead of $59.99."
--
-- Applied by the contractor, not entered by the homeowner. Field service is not
-- e-commerce: the customer is accepting a quote someone prepared for them, and
-- a promo-code box on a payment page mostly sits empty while inviting people to
-- go hunting for a code they do not have. The contractor knows the promotion
-- applies, usually while they are still on the phone.
--
-- Promotions target LABELS rather than individual items, so "everything tagged
-- Diagnostics is $9.99 this autumn" is one rule instead of an edit per item.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promotions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),

  -- Optional, and purely for attribution: which campaign produced this job.
  -- Nothing validates it against customer input, because customers never type
  -- one.
  code          TEXT,

  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'amount', 'fixed_price')),
  -- percent: 0-100. amount: currency off. fixed_price: the new unit price.
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),

  -- Null means open-ended in that direction, which is how a standing offer with
  -- no end date is expressed.
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT promotions_percent_range
    CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CONSTRAINT promotions_window
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

COMMENT ON COLUMN public.promotions.code IS
  'Campaign attribution only. Customers never enter this — promotions are applied by the contractor.';

CREATE INDEX IF NOT EXISTS promotions_company_active_idx
  ON public.promotions (company_id, is_active);

-- Which labels the promotion covers. No rows means it covers nothing, which is
-- deliberate: a promotion with no target should price nothing rather than
-- silently discount the entire catalog.
CREATE TABLE IF NOT EXISTS public.promotion_labels (
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  label_id     UUID NOT NULL REFERENCES public.catalog_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, label_id)
);

CREATE INDEX IF NOT EXISTS promotion_labels_label_idx
  ON public.promotion_labels (label_id);

-- ---------------------------------------------------------------------------
-- What a quote line remembers
-- ---------------------------------------------------------------------------
-- `unit_price` stays the price actually charged, so every total in the app and
-- on the customer's quote keeps working untouched. These two columns record why
-- it differs from the catalog, which is what lets the customer see the saving —
-- and a promotion nobody can see is not worth running.

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS list_price NUMERIC(12,2);

COMMENT ON COLUMN public.quote_items.list_price IS
  'The catalog price before a promotion. NULL when the line was not discounted.';

COMMENT ON COLUMN public.quote_items.promotion_id IS
  'The promotion that produced unit_price. ON DELETE SET NULL: deleting a promotion must not rewrite quotes already sent.';

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_own_company ON public.promotions;
CREATE POLICY promotions_own_company ON public.promotions
  FOR ALL TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS promotion_labels_own_company ON public.promotion_labels;
CREATE POLICY promotion_labels_own_company ON public.promotion_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.promotions p
             WHERE p.id = promotion_id
               AND p.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.promotions p
             WHERE p.id = promotion_id
               AND p.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
  );
