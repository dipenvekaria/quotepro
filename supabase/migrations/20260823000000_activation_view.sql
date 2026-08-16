-- Time to first sent quote, per company.
--
-- This is the activation metric the positioning and the price both rest on:
-- "your price book loaded in minutes, quote in the driveway before you leave".
-- It had never been measured, and it was never going to be measured reliably by
-- hand — so it becomes a view, computed from timestamps that already exist.
--
-- No new instrumentation. auth.users.created_at is when the account was made,
-- companies.created_at is when onboarding finished, and work_items.sent_at is
-- the milestone that matters. Nothing needed adding to record any of it.
--
-- The owner is the account that onboarded, so the clock starts at the earliest
-- user in the company rather than any user — a technician invited three weeks
-- later must not restart it.
--
-- Read it after the first real signups. A median above ten minutes means the
-- onboarding burden lands on the two people who are the binding constraint, and
-- the price argument gets harder.

create or replace view public.company_activation as
select
  c.id                                  as company_id,
  c.name                                as company_name,
  c.acquisition_source,
  c.created_at                          as workspace_created_at,
  owner.signed_up_at,
  first_quote.sent_at                   as first_quote_sent_at,
  first_quote.total                     as first_quote_total,
  -- Seeded and backfilled rows carry a sent_at older than the account that
  -- owns them — the demo company reads as minus sixty days. That is not a slow
  -- activation, it is not an activation at all, and left in it would drag any
  -- median it appeared in. Negative intervals become null so they are absent
  -- rather than wrong.
  nullif(greatest(extract(epoch from (c.created_at - owner.signed_up_at)), -1), -1)
    as secs_signup_to_workspace,
  nullif(greatest(extract(epoch from (first_quote.sent_at - c.created_at)), -1), -1)
    as secs_workspace_to_first_sent,
  nullif(greatest(extract(epoch from (first_quote.sent_at - owner.signed_up_at)), -1), -1)
    as secs_signup_to_first_sent
from public.companies c
-- Earliest account in the company: whoever created it.
left join lateral (
  select min(au.created_at) as signed_up_at
    from public.users u
    join auth.users au on au.id = u.id
   where u.company_id = c.id
) owner on true
left join lateral (
  select w.sent_at, w.total
    from public.work_items w
   where w.company_id = c.id
     and w.sent_at is not null
   order by w.sent_at asc
   limit 1
) first_quote on true;

comment on view public.company_activation is
  'Time from signup to first sent quote, per company. The activation metric; see docs/GTM_PRODUCT_CHECKLIST.md §0.1.';

-- Operator-facing. Reads auth.users, so it stays off the client entirely.
revoke all on public.company_activation from anon, authenticated;
