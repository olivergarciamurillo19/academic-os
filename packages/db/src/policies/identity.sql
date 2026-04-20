-- ============================================================
-- RLS Policies: Identity tables
-- Requires: helpers.sql (is_cohort_member, my_active_cohort_ids)
-- ============================================================
-- Revertible: run the DOWN block at the bottom.

-- ─── universities ────────────────────────────────────────────────────────────
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "universities_select_all"
  ON universities FOR SELECT
  USING (true);

CREATE POLICY "universities_insert_admin"
  ON universities FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "universities_update_admin"
  ON universities FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "universities_delete_admin"
  ON universities FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── degree_programs ─────────────────────────────────────────────────────────
ALTER TABLE degree_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "degree_programs_select_all"
  ON degree_programs FOR SELECT
  USING (true);

CREATE POLICY "degree_programs_insert_admin"
  ON degree_programs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "degree_programs_update_admin"
  ON degree_programs FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "degree_programs_delete_admin"
  ON degree_programs FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── cohorts ─────────────────────────────────────────────────────────────────
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cohorts_select_all"
  ON cohorts FOR SELECT
  USING (true);

CREATE POLICY "cohorts_insert_admin"
  ON cohorts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "cohorts_update_admin"
  ON cohorts FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "cohorts_delete_admin"
  ON cohorts FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── users ───────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Own profile only — strict: users_select_own (Issue #8 requirement)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Cohort peers: users in the same cohort can see each other's public profile.
-- Uses SECURITY DEFINER helper to avoid recursive RLS on memberships.
CREATE POLICY "users_select_same_cohort"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM my_active_cohort_ids() cid
      WHERE cid IN (
        SELECT cohort_id FROM memberships
        WHERE user_id = users.id AND status = 'active'
      )
    )
  );

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── memberships ─────────────────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Own memberships only (Issue #8 requirement)
CREATE POLICY "memberships_select_own"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

-- Same-cohort peers via SECURITY DEFINER helper — avoids infinite recursion
CREATE POLICY "memberships_select_same_cohort"
  ON memberships FOR SELECT
  USING (is_cohort_member(cohort_id));

CREATE POLICY "memberships_insert_service"
  ON memberships FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "memberships_update_admin_delegate"
  ON memberships FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR is_cohort_manager(cohort_id)
  );

CREATE POLICY "memberships_delete_admin"
  ON memberships FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================
-- DOWN (run to revert — order matters):
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
-- ============================================================
