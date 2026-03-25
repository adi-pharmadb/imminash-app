-- Migration: Create state_nominations table
-- Stores state/territory nomination eligibility for occupations

create table if not exists public.state_nominations (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  anzsco_code text not null,
  occupation_title text,
  visa_190 text,
  visa_491 text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_state_nominations_state_anzsco on public.state_nominations (state, anzsco_code);
create index idx_state_nominations_anzsco_code on public.state_nominations (anzsco_code);

-- RLS policies
alter table public.state_nominations enable row level security;
