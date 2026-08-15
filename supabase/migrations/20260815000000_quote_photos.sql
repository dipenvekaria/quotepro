-- ============================================================================
-- Photos on quotes
-- ============================================================================
-- Housecall Pro sells "estimates with photos to improve conversion", and for a
-- homeowner deciding on a five-figure job a picture of *their* failing unit is
-- worth more than any amount of copy.
--
-- Ours attach to a line item, not just the quote: "this is the compressor we're
-- replacing" belongs next to the compressor line, where it answers the question
-- the price raises. See docs/FEATURE_STRATEGY_V1.md §2.2.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quote_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_item_id  UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  -- Null means the photo belongs to the quote as a whole rather than one line.
  quote_item_id UUID REFERENCES public.quote_items(id) ON DELETE SET NULL,
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `company_id` is denormalised from work_items on purpose. Every query in this
-- codebase is tenant-scoped by hand because the pg pool bypasses RLS, and
-- reaching the company through a join on every photo read would make the
-- easiest thing to write the unscoped one.
COMMENT ON COLUMN public.quote_photos.company_id IS
  'Denormalised from work_items so photo queries can be scoped directly, per CLAUDE.md rule 1.';

COMMENT ON COLUMN public.quote_photos.quote_item_id IS
  'The line this photo illustrates. NULL means it belongs to the quote overall.';

CREATE INDEX IF NOT EXISTS quote_photos_work_item_idx
  ON public.quote_photos (work_item_id, sort_order);

ALTER TABLE public.quote_photos ENABLE ROW LEVEL SECURITY;

-- RLS is the second line of defence here, as everywhere: the app scopes by
-- company_id itself. These policies cover the Supabase-client paths.
DROP POLICY IF EXISTS quote_photos_own_company ON public.quote_photos;
CREATE POLICY quote_photos_own_company ON public.quote_photos
  FOR ALL TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- Storage
-- ============================================================================
-- Public bucket. The customer viewing /q/{public_token} is unauthenticated by
-- design, and signing every image URL on a page that must load fast on a phone
-- in a driveway buys little: the path already contains a random work item id,
-- and the photo is of the customer's own property.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-photos',
  'quote-photos',
  true,
  10485760,  -- 10MB; a modern phone photo is 3-5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Writes stay with the contractor's own company. Paths are
-- `{company_id}/{work_item_id}/{uuid}`, so the first segment is the tenant.
DROP POLICY IF EXISTS "quote photos are readable" ON storage.objects;
CREATE POLICY "quote photos are readable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'quote-photos');

DROP POLICY IF EXISTS "quote photos are writable by their company" ON storage.objects;
CREATE POLICY "quote photos are writable by their company" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quote-photos'
    AND (storage.foldername(name))[1] =
        (SELECT company_id::text FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "quote photos are deletable by their company" ON storage.objects;
CREATE POLICY "quote photos are deletable by their company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quote-photos'
    AND (storage.foldername(name))[1] =
        (SELECT company_id::text FROM public.users WHERE id = auth.uid())
  );
