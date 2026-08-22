-- Field Genie company management: complimentary access + admin notes.
-- Complimentary exempts a company from the lapsed-subscription read-only
-- lock and from checkout nudges — for early adopters and unforeseen cases.

alter table public.companies
  add column if not exists complimentary boolean not null default false,
  add column if not exists admin_notes text;
