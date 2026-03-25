-- Migration: Create leads table
-- Stores email gate submissions from Phase 1 assessment funnel

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  visa_status text,
  job_title text,
  created_at timestamptz not null default now()
);

create index idx_leads_email on public.leads (email);

-- RLS policies (enable row-level security)
alter table public.leads enable row level security;
