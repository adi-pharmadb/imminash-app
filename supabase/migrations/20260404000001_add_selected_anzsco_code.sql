-- Add selected_anzsco_code to assessments table
-- Persists the user's chosen occupation from the results page
-- so the workspace always uses the correct ANZSCO code.
ALTER TABLE assessments ADD COLUMN selected_anzsco_code text;
