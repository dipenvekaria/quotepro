-- How each contractor found Rivet.
--
-- `work_items.source` already exists and is a different thing entirely: it
-- records how the *contractor's* lead came in. Nothing anywhere recorded how
-- the contractor themselves arrived, so the one comparison that decides where
-- to spend acquisition effort — retention by channel — was not answerable at
-- any price.
--
-- Deliberately not a CHECK-constrained enum. The list of channels lives in
-- src/lib/acquisition.ts and is the thing most likely to change as real
-- channels are discovered; duplicating it here would mean a migration every
-- time one is added, and a failed signup on the day someone forgets. Nothing
-- reads this column to make a decision — it is an analytics dimension, and the
-- only writer is a Zod-validated server action.
--
-- No index. This is read by hand over a few hundred rows at most, and a
-- customer base large enough to need one would be a very good problem.

alter table public.companies
  add column if not exists acquisition_source text
    check (acquisition_source is null or length(acquisition_source) <= 40),
  add column if not exists acquisition_detail text
    check (acquisition_detail is null or length(acquisition_detail) <= 200);

comment on column public.companies.acquisition_source is
  'Self-reported channel that brought this contractor to Rivet. Values from src/lib/acquisition.ts.';
comment on column public.companies.acquisition_detail is
  'Free-text follow-up: which supply house, which creator, which contractor referred them.';
