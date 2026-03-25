-- Migration: Create documents table
-- Stores generated skill assessment documents for Phase 2

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid references auth.users on delete set null,
  document_type text not null,
  title text,
  content jsonb,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_assessment_type on public.documents (assessment_id, document_type);
create index idx_documents_user_id on public.documents (user_id);

-- RLS policies
alter table public.documents enable row level security;
