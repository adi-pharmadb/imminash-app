-- Migration: Create conversations table
-- Stores AI chat conversations for Phase 2 document workspace

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid references auth.users on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_assessment_user on public.conversations (assessment_id, user_id);

-- RLS policies
alter table public.conversations enable row level security;
