-- Wave 3: per-body markdown knowledge base.
-- Replaces the scattered duty_descriptors / qualification_requirements /
-- experience_requirements / formatting_notes / required_documents /
-- conversation_template JSON columns as the agent's source of truth for
-- body-specific facts. The JSON columns stay around for backward
-- compatibility until the chat-prompt.ts file is deleted.

alter table public.assessing_body_requirements
  add column if not exists knowledge_md text,
  add column if not exists knowledge_scraped_at timestamptz,
  add column if not exists knowledge_sources jsonb,
  add column if not exists active_revision_id uuid;

-- Revisions table. New revisions are inserted by scrapers but NOT promoted;
-- promotion is a manual UPDATE setting active_revision_id after human diff
-- review.
create table if not exists public.assessing_body_knowledge_revisions (
  id uuid primary key default gen_random_uuid(),
  body_id uuid not null references public.assessing_body_requirements(id) on delete cascade,
  knowledge_md text not null,
  scraped_at timestamptz not null default now(),
  sources jsonb,
  diff_summary text,
  promoted_at timestamptz,
  promoted_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_revisions_body_id
  on public.assessing_body_knowledge_revisions (body_id, created_at desc);

alter table public.assessing_body_knowledge_revisions enable row level security;

-- FK from active_revision_id to the revisions table (added after table exists).
alter table public.assessing_body_requirements
  add constraint assessing_body_requirements_active_revision_fkey
  foreign key (active_revision_id)
  references public.assessing_body_knowledge_revisions(id)
  on delete set null;

-- Service role reads/writes; authenticated users never touch knowledge rows.
create policy "service role full access on knowledge revisions"
  on public.assessing_body_knowledge_revisions
  for all
  to service_role
  using (true)
  with check (true);
