-- RLS policies for all application tables.
-- The anon role needs INSERT on leads and assessments (pre-auth flow).
-- Authenticated users can read/update their own data.
-- Service role bypasses RLS automatically.

-- ============================================================
-- LEADS: anon can insert (email gate), authenticated can read own
-- ============================================================
CREATE POLICY "anon_insert_leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_read_own_leads"
  ON leads FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.jwt() ->> 'email'));

-- ============================================================
-- ASSESSMENTS: anon can insert (pre-auth), authenticated can read/update own
-- ============================================================
CREATE POLICY "anon_insert_assessments"
  ON assessments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated_read_own_assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_update_own_assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow service-role-like update for linking (when user_id is null, allow setting it)
-- This is needed by the auth callback's linkAssessmentToUser
CREATE POLICY "authenticated_claim_assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- DOCUMENTS: authenticated can CRUD own (via assessment ownership)
-- ============================================================
CREATE POLICY "authenticated_read_own_documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_insert_own_documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_update_own_documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS: authenticated can CRUD own
-- ============================================================
CREATE POLICY "authenticated_read_own_conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_insert_own_conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_update_own_conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PROFILES: authenticated can read/update own
-- ============================================================
CREATE POLICY "authenticated_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "authenticated_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "authenticated_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- REFERENCE TABLES: public read access
-- ============================================================
CREATE POLICY "public_read_occupations"
  ON occupations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public_read_state_nominations"
  ON state_nominations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public_read_invitation_rounds"
  ON invitation_rounds FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public_read_assessing_body_requirements"
  ON assessing_body_requirements FOR SELECT
  TO anon, authenticated
  USING (true);
