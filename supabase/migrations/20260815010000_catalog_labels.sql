-- ============================================================================
-- Catalog labels
-- ============================================================================
-- `catalog_items.category` was free text, so "Diagnostics", "diagnostic" and
-- "Diagnostic Fees" all coexisted and the grouping stopped meaning anything.
-- Labels are a real set the contractor picks from, created on first use — the
-- same lookup-or-create shape as adding a line item or finding a customer.
--
-- Many-to-many because one item genuinely belongs in several groups: a service
-- call is both "Diagnostics" and "Call-out", and later it is also whatever a
-- promotion needs to target.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.catalog_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness is the whole point: it is what stops "Diagnostics"
-- and "diagnostics" becoming two labels and undoing the consistency this exists
-- to create.
CREATE UNIQUE INDEX IF NOT EXISTS catalog_labels_company_name_key
  ON public.catalog_labels (company_id, lower(trim(name)));

CREATE TABLE IF NOT EXISTS public.catalog_item_labels (
  catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  label_id        UUID NOT NULL REFERENCES public.catalog_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (catalog_item_id, label_id)
);

CREATE INDEX IF NOT EXISTS catalog_item_labels_label_idx
  ON public.catalog_item_labels (label_id);

-- ---------------------------------------------------------------------------
-- Seed from the free-text categories already in use
-- ---------------------------------------------------------------------------
-- A contractor who has imported a price book should not open the labels UI to
-- an empty list — their categories already describe how they think about their
-- work. Trimmed and de-duplicated case-insensitively on the way in.

INSERT INTO public.catalog_labels (company_id, name)
SELECT DISTINCT ON (ci.company_id, lower(trim(ci.category)))
       ci.company_id, trim(ci.category)
  FROM public.catalog_items ci
 WHERE ci.category IS NOT NULL
   AND trim(ci.category) <> ''
 ORDER BY ci.company_id, lower(trim(ci.category)), ci.created_at
ON CONFLICT DO NOTHING;

INSERT INTO public.catalog_item_labels (catalog_item_id, label_id)
SELECT ci.id, cl.id
  FROM public.catalog_items ci
  JOIN public.catalog_labels cl
    ON cl.company_id = ci.company_id
   AND lower(trim(cl.name)) = lower(trim(ci.category))
 WHERE ci.category IS NOT NULL AND trim(ci.category) <> ''
ON CONFLICT DO NOTHING;

-- `catalog_items.category` is deliberately left in place. CSV import writes it,
-- it is what a contractor's own spreadsheet carries, and dropping it would make
-- the importer lossy. It is now the raw import value; labels are the curated set.
COMMENT ON COLUMN public.catalog_items.category IS
  'Free-text category as imported. Labels (catalog_item_labels) are the curated grouping — prefer those for filtering.';

ALTER TABLE public.catalog_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_item_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_labels_own_company ON public.catalog_labels;
CREATE POLICY catalog_labels_own_company ON public.catalog_labels
  FOR ALL TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS catalog_item_labels_own_company ON public.catalog_item_labels;
CREATE POLICY catalog_item_labels_own_company ON public.catalog_item_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.catalog_items ci
       WHERE ci.id = catalog_item_id
         AND ci.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catalog_items ci
       WHERE ci.id = catalog_item_id
         AND ci.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
  );
