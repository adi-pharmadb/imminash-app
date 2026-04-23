-- Pillar 1: per-body portal form schema. Adds a jsonb column so the
-- Submission Playbook generator can render per-field copy-paste
-- instructions for the body's application portal.
--
-- The YAML source lives in content/portal-schemas/<Body>.yaml. The
-- loader script (scripts/load-portal-schema.ts) converts YAML to JSON
-- and upserts into this column.

alter table public.assessing_body_requirements
  add column if not exists portal_schema jsonb,
  add column if not exists portal_schema_captured_at timestamptz;
