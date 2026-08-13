-- ============================================================================
-- Automated quote follow-up
-- ============================================================================
-- A quote sent and never chased is a lost job. docs/GTM_PRODUCT_CHECKLIST.md
-- calls this the biggest revenue lever in the category, and Jobber gates it
-- behind their $80+/month tier.
--
-- `sent_at`, `viewed_at` and `accepted_at` already exist on work_items. What was
-- missing is the record of what we have already chased, without which the job
-- either re-sends the same nudge every night or cannot run twice.
-- ============================================================================

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.work_items.last_followup_at IS
  'When the customer was last nudged about this unaccepted quote. NULL means never.';

COMMENT ON COLUMN public.work_items.followup_count IS
  'How many follow-ups have been sent. Capped in code so a quote is chased, not hounded.';

-- The sweep asks one question: which sent-but-unaccepted quotes are due a
-- nudge. Partial, because every other status is irrelevant to it and the
-- pipeline is dominated by them.
CREATE INDEX IF NOT EXISTS work_items_followup_due_idx
  ON public.work_items (company_id, sent_at)
  WHERE status IN ('quote_sent', 'quote_viewed');
