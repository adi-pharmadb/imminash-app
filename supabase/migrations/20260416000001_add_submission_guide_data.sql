-- Cache AI-generated submission guide content on conversations.
-- Payload shape is enforced at the app layer (see /api/conversations/[id]/submission-guide).

alter table public.conversations
  add column if not exists submission_guide_data jsonb,
  add column if not exists submission_guide_generated_at timestamptz;
