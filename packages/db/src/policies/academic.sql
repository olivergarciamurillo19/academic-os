-- ============================================================
-- RLS Policies: Academic tables
-- Requires: helpers.sql (is_cohort_member, my_active_cohort_ids, is_cohort_manager)
-- ============================================================
-- Revertible: run the DOWN block at the bottom.

-- ─── subjects ────────────────────────────────────────────────────────────────
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Issue #8: subjects_select_cohort_member — user only sees subjects of their cohort
CREATE POLICY "subjects_select_cohort_member"
  ON subjects FOR SELECT
  USING (is_cohort_member(cohort_id));

CREATE POLICY "subjects_insert_service"
  ON subjects FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "subjects_update_admin_delegate"
  ON subjects FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR is_cohort_manager(cohort_id)
  );

CREATE POLICY "subjects_delete_admin"
  ON subjects FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── subject_members ─────────────────────────────────────────────────────────
ALTER TABLE subject_members ENABLE ROW LEVEL SECURITY;

-- Issue #8: subject_members_select_same_subject — only see memberships of subjects you belong to
CREATE POLICY "subject_members_select_same_subject"
  ON subject_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_members.subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

-- Users can join subjects within their active cohort
CREATE POLICY "subject_members_insert_self"
  ON subject_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

CREATE POLICY "subject_members_insert_service"
  ON subject_members FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "subject_members_delete_own_or_admin"
  ON subject_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_members.subject_id
        AND is_cohort_manager(s.cohort_id)
    )
  );

-- ─── topics ──────────────────────────────────────────────────────────────────
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Issue #8: topics_select_cohort_member — only see topics from subjects in your cohort
CREATE POLICY "topics_select_cohort_member"
  ON topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = topics.subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

CREATE POLICY "topics_insert_service"
  ON topics FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "topics_update_admin_delegate"
  ON topics FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = topics.subject_id
        AND is_cohort_manager(s.cohort_id)
    )
  );

CREATE POLICY "topics_delete_admin"
  ON topics FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- DOWN:
-- ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "topics_delete_admin" ON topics;
-- DROP POLICY IF EXISTS "topics_update_admin_delegate" ON topics;
-- DROP POLICY IF EXISTS "topics_insert_service" ON topics;
-- DROP POLICY IF EXISTS "topics_select_cohort_member" ON topics;
-- ALTER TABLE subject_members DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "subject_members_delete_own_or_admin" ON subject_members;
-- DROP POLICY IF EXISTS "subject_members_insert_service" ON subject_members;
-- DROP POLICY IF EXISTS "subject_members_insert_self" ON subject_members;
-- DROP POLICY IF EXISTS "subject_members_select_same_subject" ON subject_members;
-- ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "subjects_delete_admin" ON subjects;
-- DROP POLICY IF EXISTS "subjects_update_admin_delegate" ON subjects;
-- DROP POLICY IF EXISTS "subjects_insert_service" ON subjects;
-- DROP POLICY IF EXISTS "subjects_select_cohort_member" ON subjects;
-- ============================================================
