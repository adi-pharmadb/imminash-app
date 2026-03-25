-- Migration: Create occupations table
-- Stores ANZSCO occupation data seeded from legacy CSV

create table if not exists public.occupations (
  id uuid primary key default gen_random_uuid(),
  anzsco_code text not null,
  title text not null,
  skill_level integer,
  assessing_authority text,
  mltssl boolean not null default false,
  stsol boolean not null default false,
  csol boolean not null default false,
  rol boolean not null default false,
  min_189_points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_occupations_anzsco_code on public.occupations (anzsco_code);
create index idx_occupations_title on public.occupations (title);
create index idx_occupations_assessing_authority on public.occupations (assessing_authority);

-- RLS policies
alter table public.occupations enable row level security;
