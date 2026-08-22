-- In-app notifications: mentions, assignments, quote events, payments.
-- Written by the server (pg pool); RLS mirrors notification_prefs — a user
-- reads and updates only their own rows.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  actor_id   uuid references public.users(id) on delete set null,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_service on public.notifications
  for all to service_role using (true) with check (true);
