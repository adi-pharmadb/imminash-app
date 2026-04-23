-- Pillar 3: per-conversation readiness verdict.
-- Stores the most recent [READINESS_UPDATE] marker's JSON payload on
-- the conversation so the UI can render the verdict across reloads.

alter table public.conversations
  add column if not exists readiness_verdict jsonb;
