-- Sales/estimate visit: the field visit that produces a quote, before the job.
-- Many trades send a salesperson to quote on site, then a technician to do the
-- work — two appointments, two people, one work item. Per ADR 0002 this extends
-- the record rather than adding an appointments table.

-- A lead with a booked sales visit. Sits between lead and quote_draft.
alter type public.work_item_status add value if not exists 'estimate_scheduled' before 'quote_draft';

-- The estimate appointment, distinct from the job appointment (scheduled_start
-- / assigned_to, which stay the technician's).
alter table public.work_items
  add column if not exists estimate_scheduled_start timestamptz,
  add column if not exists estimate_scheduled_end   timestamptz,
  add column if not exists estimate_assigned_to      uuid references public.users(id) on delete set null;

create index if not exists work_items_estimate_start_idx
  on public.work_items (company_id, estimate_scheduled_start)
  where estimate_scheduled_start is not null;
create index if not exists work_items_estimate_assignee_idx
  on public.work_items (estimate_assigned_to)
  where estimate_assigned_to is not null;

-- A booked estimate is still a lead in the pipeline until a quote exists.
create or replace function public.set_work_item_kind()
returns trigger language plpgsql as $$
begin
  new.kind := case
    when new.status = 'lead' then 'lead'
    when new.status = 'estimate_scheduled' then 'lead'
    when new.status = 'archived' then 'archived'
    when new.status::text like 'quote_%' then 'quote'
    when new.status::text like 'job_%'   then 'job'
    else 'unknown'
  end;
  return new;
end;
$$;
