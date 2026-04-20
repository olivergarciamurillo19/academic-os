-- ============================================================
-- RLS Policies: Academic tables
-- ============================================================
-- Revertible: DROP POLICY IF EXISTS + ALTER TABLE DISABLE ROW LEVEL SECURITY

-- ─── subjects ────────────────────────────────────────────────────────────────
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Members of the same cohort can read subjects
CREATE POLICY "subjects_select_cohort_member"
  ON subjects FOR SELECT
  USING (
    cohort_id IN (
      SELECT cohort_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only service_role inserts subjects (templates + cloning)
CREATE POLICY "subjects_insert_service"
  ON subjects FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins and delegates can update subject metadata within their cohort
CREATE POLICY "subjects_update_admin_delegate"
  ON subjects FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.cohort_id = subjects.cohort_id
        AND m.role IN ('admin', 'delegate')
        AND m.status = 'active'
    )
  );

CREATE POLICY "subjects_delete_admin"
  ON subjects FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── subject_members ─────────────────────────────────────────────────────────
ALTER TABLE subject_members ENABLE ROW LEVEL SECURITY;

-- Users can see subject_members of subjects they belong to
CREATE POLICY "subject_members_select_member"
  ON subject_members FOR SELECT
  USING (
    subject_id IN (
      SELECT sm.subject_id FROM subject_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Users can add themselves to subjects within their cohort
CREATE POLICY "subject_members_insert_self"
  ON subject_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM subjects s
      JOIN memberships m ON m.cohort_id = s.cohort_id
      WHERE s.id = subject_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- Service_role can insert any subject member (e.g. admin assignments)
CREATE POLICY "subject_members_insert_service"
  ON subject_members FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Users can remove themselves; admins can remove anyone
CREATE POLICY "subject_members_delete_own_or_admin"
  ON subject_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM subjects s
      JOIN memberships m ON m.cohort_id = s.cohort_id
      WHERE s.id = subject_members.subject_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- ─── topics ──────────────────────────────────────────────────────────────────
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Members of the subject's cohort can read topics
CREATE POLICY "topics_select_cohort_member"
  ON topics FOR SELECT
  USING (
    subject_id IN (
      SELECT s.id FROM subjects s
      JOIN memberships m ON m.cohort_id = s.cohort_id
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );

-- Service_role inserts/updates topics (template management)
CREATE POLICY "topics_insert_service"
  ON topics FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins and delegates can mutate topics
CREATE POLICY "topics_update_admin_delegate"
  ON topics FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM subjects s
      JOIN memberships m ON m.cohort_id = s.cohort_id
      WHERE s.id = topics.subject_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'delegate')
        AND m.status = 'active'
    )
  );

CREATE POLICY "topics_delete_admin"
  ON topics FOR DELETE
  USING (auth.role() = 'service_role');
