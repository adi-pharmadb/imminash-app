-- Migration: Make conversations the spine of the chat-first experience.
-- Adds phase/profile/points/matches/cv/paid columns, drops NOT NULL on assessment_id,
-- replaces RLS policies (which previously joined to assessments) with direct user_id checks.

-- 1. Drop old assessment-id-based RLS policies
drop policy if exists "authenticated_read_own_conversations" on public.conversations;
drop policy if exists "authenticated_insert_own_conversations" on public.conversations;
drop policy if exists "authenticated_update_own_conversations" on public.conversations;

-- 2. Allow conversations to exist without an assessment row (chat-first flow)
alter table public.conversations
  alter column assessment_id drop not null;

-- 3. New columns
alter table public.conversations
  add column if not exists status text not null default 'phase1'
    check (status in ('phase1','awaiting_payment','paid','phase2','done')),
  add column if not exists profile_data jsonb not null default '{}'::jsonb,
  add column if not exists points_breakdown jsonb,
  add column if not exists matched_occupations jsonb,
  add column if not exists selected_anzsco_code text,
  add column if not exists cv_data jsonb,
  add column if not exists paid_at timestamptz;

-- 4. Indexes
create index if not exists idx_conversations_user_status
  on public.conversations (user_id, status);

-- 5. New user-id-based RLS policies
create policy "conversations_select_own"
  on public.conversations for select
  to authenticated
  using (user_id = auth.uid());

create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "conversations_update_own"
  on public.conversations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
