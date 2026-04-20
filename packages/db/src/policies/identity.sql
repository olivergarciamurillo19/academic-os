-- ============================================================
-- RLS Policies: Identity tables
-- ============================================================
-- Revertible: DROP POLICY IF EXISTS + ALTER TABLE DISABLE ROW LEVEL SECURITY

-- ─── universities ────────────────────────────────────────────────────────────
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- Everyone can read universities (they are public reference data)
CREATE POLICY "universities_select_all"
  ON universities FOR SELECT
  USING (true);

-- Only admins (service_role or admin membership) can mutate
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

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can read profiles of others in the same cohort
CREATE POLICY "users_select_same_cohort"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.cohort_id = m2.cohort_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = users.id
        AND m1.status = 'active'
        AND m2.status = 'active'
    )
  );

-- Users can insert their own profile (triggered after auth.users insert)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Hard delete not allowed from client; service_role only
CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── memberships ─────────────────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "memberships_select_own"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see memberships of people in the same cohort
CREATE POLICY "memberships_select_same_cohort"
  ON memberships FOR SELECT
  USING (
    cohort_id IN (
      SELECT cohort_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only service_role creates memberships (via server action / onboarding)
CREATE POLICY "memberships_insert_service"
  ON memberships FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Admins and delegates can update membership status within their cohort
CREATE POLICY "memberships_update_admin_delegate"
  ON memberships FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.cohort_id = memberships.cohort_id
        AND m.role IN ('admin', 'delegate')
        AND m.status = 'active'
    )
  );

CREATE POLICY "memberships_delete_admin"
  ON memberships FOR DELETE
  USING (auth.role() = 'service_role');
