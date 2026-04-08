-- Allow documents to be associated with a conversation directly (chat-first
-- flow has no assessment row at doc-create time). Also relax the status enum.

alter table public.documents
  add column if not exists conversation_id uuid references public.conversations (id) on delete cascade,
  alter column assessment_id drop not null;

create index if not exists idx_documents_conversation on public.documents (conversation_id);

-- Add status column (didn't exist before chat-first flow)
alter table public.documents
  add column if not exists status text not null default 'draft';

alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents
  add constraint documents_status_check
  check (status in ('draft','in_progress','in_review','approved'));
