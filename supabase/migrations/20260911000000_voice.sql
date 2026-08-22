-- AI call answering: per-company agent + number, and the calls themselves.

alter table public.companies
  add column if not exists voice_enabled boolean not null default false,
  add column if not exists retell_agent_id text,
  add column if not exists voice_number text;

create unique index if not exists companies_voice_number_key
  on public.companies (voice_number) where voice_number is not null;

create table if not exists public.voice_calls (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  retell_call_id text not null unique,
  from_number    text,
  to_number      text,
  started_at     timestamptz,
  duration_seconds integer,
  summary        text,
  transcript     text,
  recording_url  text,
  work_item_id   uuid references public.work_items(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists voice_calls_company_started_idx
  on public.voice_calls (company_id, started_at desc);

alter table public.voice_calls enable row level security;

create policy voice_calls_select on public.voice_calls
  for select to authenticated
  using (company_id = public.get_user_company_id());
create policy voice_calls_service on public.voice_calls
  for all to service_role using (true) with check (true);
