-- Add status column to documents table for approval state persistence
-- Also adds fact-check declaration fields.
ALTER TABLE documents ADD COLUMN status text NOT NULL DEFAULT 'draft';
ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('draft', 'in_review', 'approved'));
ALTER TABLE documents ADD COLUMN declaration_confirmed_at timestamptz;
ALTER TABLE documents ADD COLUMN declaration_text text;
