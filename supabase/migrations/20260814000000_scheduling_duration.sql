-- ============================================================================
-- Job duration and working hours
-- ============================================================================
-- Every competitor asks a dispatcher to type how long a job takes, because
-- their price book is a name and a price. Ours carries `labor_hours` per
-- catalog item, so an accepted quote already knows: sum(quantity x labor_hours).
--
-- That is the whole basis for capacity — "Thursday has 6 hours free" only means
-- something if jobs carry honest durations.
-- ============================================================================

-- Snapshotted from the catalog when the line is saved, exactly as unit_price
-- already is. A quote must not change because someone edited the price book
-- afterwards, and that applies to the hours as much as the money.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS labor_hours NUMERIC(8,2);

COMMENT ON COLUMN public.quote_items.labor_hours IS
  'Labour hours for ONE unit, copied from catalog_items at save time. Multiply by quantity for the line total.';

-- Recomputed whenever the line items change. Stored rather than derived so the
-- calendar and capacity views are a plain read, and so a contractor can
-- override it when they know better than the catalog does.
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2);

COMMENT ON COLUMN public.work_items.estimated_hours IS
  'Estimated on-site hours, summed from quote_items.labor_hours. Nullable: a job whose items carry no hours has no estimate, and guessing one would be worse than showing none.';

-- ============================================================================
-- companies.business_hours
-- ============================================================================
-- When this contractor works. Without it, "suggest a slot" would happily offer
-- 2am on a Sunday.
--
-- Company-level to start. Per-technician hours are the obvious next step, but
-- they need a real contractor to tell us how they think about a week before we
-- model it — most small shops run one schedule.
--
-- Shape: {"mon": {"start": "08:00", "end": "17:00"}, ..., "sun": null}
-- null for a day means closed.
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT
    '{"mon":{"start":"08:00","end":"17:00"},
      "tue":{"start":"08:00","end":"17:00"},
      "wed":{"start":"08:00","end":"17:00"},
      "thu":{"start":"08:00","end":"17:00"},
      "fri":{"start":"08:00","end":"17:00"},
      "sat":null,
      "sun":null}'::jsonb;

COMMENT ON COLUMN public.companies.business_hours IS
  'Working hours per weekday for slot suggestions. null for a day means closed. Defaults to weekdays 8-5.';

-- Capacity asks one question per day: what is already booked, and for whom.
CREATE INDEX IF NOT EXISTS work_items_scheduled_assignee_idx
  ON public.work_items (company_id, scheduled_start, assigned_to)
  WHERE scheduled_start IS NOT NULL;
