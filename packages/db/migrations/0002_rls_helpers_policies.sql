-- Migration 0001: RLS helper functions + policies for identity and academic tables
-- Reversible: see DOWN block at end of file.

-- ─── Helper functions (SECURITY DEFINER to avoid recursive RLS) ──────────────

CREATE OR REPLACE FUNCTION is_cohort_member(p_cohort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND cohort_id = p_cohort_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION my_active_cohort_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cohort_id FROM memberships
  WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION is_cohort_manager(p_cohort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND cohort_id = p_cohort_id
      AND role IN ('admin', 'delegate')
      AND status = 'active'
  );
$$;

-- ─── universities ────────────────────────────────────────────────────────────
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "universities_select_all" ON universities FOR SELECT USING (true);
CREATE POLICY "universities_insert_admin" ON universities FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "universities_update_admin" ON universities FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "universities_delete_admin" ON universities FOR DELETE USING (auth.role() = 'service_role');

-- ─── degree_programs ─────────────────────────────────────────────────────────
ALTER TABLE degree_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "degree_programs_select_all" ON degree_programs FOR SELECT USING (true);
CREATE POLICY "degree_programs_insert_admin" ON degree_programs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "degree_programs_update_admin" ON degree_programs FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "degree_programs_delete_admin" ON degree_programs FOR DELETE USING (auth.role() = 'service_role');

-- ─── cohorts ─────────────────────────────────────────────────────────────────
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cohorts_select_all" ON cohorts FOR SELECT USING (true);
CREATE POLICY "cohorts_insert_admin" ON cohorts FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "cohorts_update_admin" ON cohorts FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "cohorts_delete_admin" ON cohorts FOR DELETE USING (auth.role() = 'service_role');

-- ─── users ───────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_same_cohort" ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM my_active_cohort_ids() cid
      WHERE cid IN (SELECT cohort_id FROM memberships WHERE user_id = users.id AND status = 'active')
    )
  );
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (auth.role() = 'service_role');

-- ─── memberships ─────────────────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select_own" ON memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "memberships_select_same_cohort" ON memberships FOR SELECT USING (is_cohort_member(cohort_id));
CREATE POLICY "memberships_insert_service" ON memberships FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "memberships_update_admin_delegate" ON memberships FOR UPDATE
  USING (auth.role() = 'service_role' OR is_cohort_manager(cohort_id));
CREATE POLICY "memberships_delete_admin" ON memberships FOR DELETE USING (auth.role() = 'service_role');

-- ─── subjects ────────────────────────────────────────────────────────────────
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_select_cohort_member" ON subjects FOR SELECT USING (is_cohort_member(cohort_id));
CREATE POLICY "subjects_insert_service" ON subjects FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "subjects_update_admin_delegate" ON subjects FOR UPDATE
  USING (auth.role() = 'service_role' OR is_cohort_manager(cohort_id));
CREATE POLICY "subjects_delete_admin" ON subjects FOR DELETE USING (auth.role() = 'service_role');

-- ─── subject_members ─────────────────────────────────────────────────────────
ALTER TABLE subject_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subject_members_select_same_subject" ON subject_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_members.subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "subject_members_insert_self" ON subject_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "subject_members_insert_service" ON subject_members FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "subject_members_delete_own_or_admin" ON subject_members FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_members.subject_id AND is_cohort_manager(s.cohort_id)));

-- ─── topics ──────────────────────────────────────────────────────────────────
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select_cohort_member" ON topics FOR SELECT
  USING (EXISTS (SELECT 1 FROM subjects s WHERE s.id = topics.subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "topics_insert_service" ON topics FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "topics_update_admin_delegate" ON topics FOR UPDATE
  USING (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = topics.subject_id AND is_cohort_manager(s.cohort_id)));
CREATE POLICY "topics_delete_admin" ON topics FOR DELETE USING (auth.role() = 'service_role');

-- ============================================================
-- DOWN (run in reverse order):
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
-- ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "memberships_delete_admin" ON memberships;
-- DROP POLICY IF EXISTS "memberships_update_admin_delegate" ON memberships;
-- DROP POLICY IF EXISTS "memberships_insert_service" ON memberships;
-- DROP POLICY IF EXISTS "memberships_select_same_cohort" ON memberships;
-- DROP POLICY IF EXISTS "memberships_select_own" ON memberships;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "users_delete_admin" ON users;
-- DROP POLICY IF EXISTS "users_update_own" ON users;
-- DROP POLICY IF EXISTS "users_insert_own" ON users;
-- DROP POLICY IF EXISTS "users_select_same_cohort" ON users;
-- DROP POLICY IF EXISTS "users_select_own" ON users;
-- ALTER TABLE cohorts DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "cohorts_delete_admin" ON cohorts;
-- DROP POLICY IF EXISTS "cohorts_update_admin" ON cohorts;
-- DROP POLICY IF EXISTS "cohorts_insert_admin" ON cohorts;
-- DROP POLICY IF EXISTS "cohorts_select_all" ON cohorts;
-- ALTER TABLE degree_programs DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "degree_programs_delete_admin" ON degree_programs;
-- DROP POLICY IF EXISTS "degree_programs_update_admin" ON degree_programs;
-- DROP POLICY IF EXISTS "degree_programs_insert_admin" ON degree_programs;
-- DROP POLICY IF EXISTS "degree_programs_select_all" ON degree_programs;
-- ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "universities_delete_admin" ON universities;
-- DROP POLICY IF EXISTS "universities_update_admin" ON universities;
-- DROP POLICY IF EXISTS "universities_insert_admin" ON universities;
-- DROP POLICY IF EXISTS "universities_select_all" ON universities;
-- DROP FUNCTION IF EXISTS is_cohort_manager(uuid);
-- DROP FUNCTION IF EXISTS my_active_cohort_ids();
-- DROP FUNCTION IF EXISTS is_cohort_member(uuid);
-- ============================================================
