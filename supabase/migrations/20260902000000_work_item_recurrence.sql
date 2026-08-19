-- Recurring service visits: a work item can carry a repeat rule.
-- { cadence: 'weekly'|'biweekly'|'monthly', next_at: timestamptz-iso,
--   auto_invoice: boolean }
-- Only the template row carries it; spawned visits reference their source in
-- metadata.recurred_from and never recur themselves.
alter table work_items add column if not exists recurrence jsonb;

-- The daily cron scans for due templates.
create index if not exists work_items_recurrence_due_idx
  on work_items (((recurrence->>'next_at')))
  where recurrence is not null;
