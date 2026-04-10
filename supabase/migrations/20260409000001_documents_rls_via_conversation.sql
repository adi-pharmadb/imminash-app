-- Chat-first flow: documents are keyed by conversation_id and assessment_id
-- is nullable, so the old RLS policies (which require assessment_id ownership)
-- silently block inserts/selects. Add policies that also allow ownership via
-- the conversations table.

CREATE POLICY "authenticated_read_own_documents_via_conversation"
  ON documents FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_insert_own_documents_via_conversation"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_update_own_documents_via_conversation"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
