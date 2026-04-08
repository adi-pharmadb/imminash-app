-- Add cv_data column to assessments table
-- Stores structured CV parse output (employers, qualifications, extracted text)
-- so it survives page refreshes and feeds into the system prompt.
ALTER TABLE assessments ADD COLUMN cv_data jsonb;
