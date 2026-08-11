-- ============================================================================
-- work_items.customer_summary
-- ============================================================================
-- A plain-language explanation of the quote, written for the homeowner and
-- shown at the top of the public /q/{public_token} viewer.
--
-- Stored rather than generated per view, for three reasons: the customer must
-- see the same words every time they open the link, generating on view would
-- bill a model call per page load including bots, and a quote that has been
-- accepted should keep the text it was accepted with.
--
-- A real column rather than a metadata key, per docs/DATA_MODEL.md: "prefer a
-- real column when a field becomes load-bearing", and this is on the screen a
-- five-figure decision gets made on.
-- ============================================================================

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS customer_summary TEXT;

COMMENT ON COLUMN public.work_items.customer_summary IS
  'Plain-language explanation of the quote for the customer, shown on /q/{public_token}. Generated from the line items; never contains prices.';
