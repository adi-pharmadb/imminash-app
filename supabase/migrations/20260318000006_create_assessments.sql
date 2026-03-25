-- Migration: Create assessments table
-- Stores completed Phase 1 assessment results
-- user_id is nullable to support anonymous users before auth

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  profile_data jsonb not null,
  points_breakdown jsonb not null,
  total_points integer not null,
  matched_occupations jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assessments_user_id on public.assessments (user_id);
create index idx_assessments_lead_id on public.assessments (lead_id);

-- RLS policies
alter table public.assessments enable row level security;
