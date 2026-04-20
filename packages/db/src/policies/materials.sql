-- ============================================================
-- RLS Policies: Materials tables (resources, documents)
-- Requires: helpers.sql (is_cohort_member)
-- ============================================================
-- Storage bucket policies are in supabase/config.toml
-- Revertible: run the DOWN block at the bottom.

-- ─── resources ───────────────────────────────────────────────────────────────
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Personal scope: only owner reads
CREATE POLICY "resources_select_personal"
  ON resources FOR SELECT
  USING (
    owner_user_id = auth.uid()
    AND scope = 'personal'
  );

-- Shared scope: any member of the subject's cohort can read
CREATE POLICY "resources_select_shared"
  ON resources FOR SELECT
  USING (
    scope IN ('subject_shared', 'cohort_shared')
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = resources.subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

-- Only owner can insert their own resources
CREATE POLICY "resources_insert_own"
  ON resources FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

-- Only owner can update their resources
CREATE POLICY "resources_update_own"
  ON resources FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Soft delete by owner; hard delete by service_role only
CREATE POLICY "resources_delete_own"
  ON resources FOR DELETE
  USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');

-- ─── documents ───────────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- User can read document if they own the resource
CREATE POLICY "documents_select_owner"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = documents.resource_id
        AND r.owner_user_id = auth.uid()
    )
  );

-- Service_role manages document processing lifecycle
CREATE POLICY "documents_insert_service"
  ON documents FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "documents_update_service"
  ON documents FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "documents_delete_service"
  ON documents FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- DOWN:
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "documents_delete_service" ON documents;
-- DROP POLICY IF EXISTS "documents_update_service" ON documents;
-- DROP POLICY IF EXISTS "documents_insert_service" ON documents;
-- DROP POLICY IF EXISTS "documents_select_owner" ON documents;
-- ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "resources_delete_own" ON resources;
-- DROP POLICY IF EXISTS "resources_update_own" ON resources;
-- DROP POLICY IF EXISTS "resources_insert_own" ON resources;
-- DROP POLICY IF EXISTS "resources_select_shared" ON resources;
-- DROP POLICY IF EXISTS "resources_select_personal" ON resources;
-- ============================================================
