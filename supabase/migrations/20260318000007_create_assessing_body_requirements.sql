-- Migration: Create assessing_body_requirements table
-- Stores requirements and conversation templates for skill assessing bodies

create table if not exists public.assessing_body_requirements (
  id uuid primary key default gen_random_uuid(),
  body_name text not null unique,
  required_documents jsonb,
  duty_descriptors jsonb,
  qualification_requirements jsonb,
  experience_requirements jsonb,
  formatting_notes text,
  conversation_template jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_assessing_body_requirements_body_name on public.assessing_body_requirements (body_name);

-- RLS policies
alter table public.assessing_body_requirements enable row level security;
