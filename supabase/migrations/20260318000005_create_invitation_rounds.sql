-- Migration: Create invitation_rounds table
-- Stores DHA SkillSelect invitation round data

create table if not exists public.invitation_rounds (
  id uuid primary key default gen_random_uuid(),
  round_date date,
  visa_subclass text,
  anzsco_code text,
  minimum_points integer,
  invitations_issued integer,
  created_at timestamptz not null default now()
);

create index idx_invitation_rounds_anzsco_code on public.invitation_rounds (anzsco_code);

-- RLS policies
alter table public.invitation_rounds enable row level security;
