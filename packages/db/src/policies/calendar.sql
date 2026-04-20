-- ============================================================
-- RLS Policies: Calendar tables (events, tasks, reminders, integrations)
-- Requires: helpers.sql (is_cohort_member)
-- ============================================================
-- Revertible: run DOWN block at end.

-- ─── events ──────────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- User sees their own personal events
CREATE POLICY "events_select_own"
  ON events FOR SELECT
  USING (owner_user_id = auth.uid());

-- User sees cohort-level official events from their cohort (§7.3 rule 1)
CREATE POLICY "events_select_cohort_shared"
  ON events FOR SELECT
  USING (
    cohort_id IS NOT NULL
    AND is_official = true
    AND is_cohort_member(cohort_id)
  );

-- Users create their own events
CREATE POLICY "events_insert_own"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id AND is_official = false);

-- Service_role creates official/cohort events
CREATE POLICY "events_insert_service"
  ON events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Owner updates their event; admin/delegate can make events official
CREATE POLICY "events_update_own"
  ON events FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "events_update_official"
  ON events FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR (cohort_id IS NOT NULL AND is_cohort_manager(cohort_id))
  );

CREATE POLICY "events_delete_own"
  ON events FOR DELETE
  USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');

-- ─── tasks ───────────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── reminders ───────────────────────────────────────────────────────────────
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select_own"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reminders_insert_service"
  ON reminders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "reminders_update_service"
  ON reminders FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "reminders_delete_own"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── integrations ────────────────────────────────────────────────────────────
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select_own"
  ON integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users manage their own integrations; tokens stored server-side via service_role
CREATE POLICY "integrations_insert_service"
  ON integrations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "integrations_update_service"
  ON integrations FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "integrations_delete_own"
  ON integrations FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================================
-- DOWN:
-- ALTER TABLE integrations DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "integrations_delete_own" ON integrations;
-- DROP POLICY IF EXISTS "integrations_update_service" ON integrations;
-- DROP POLICY IF EXISTS "integrations_insert_service" ON integrations;
-- DROP POLICY IF EXISTS "integrations_select_own" ON integrations;
-- ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "reminders_delete_own" ON reminders;
-- DROP POLICY IF EXISTS "reminders_update_service" ON reminders;
-- DROP POLICY IF EXISTS "reminders_insert_service" ON reminders;
-- DROP POLICY IF EXISTS "reminders_select_own" ON reminders;
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "tasks_delete_own" ON tasks;
-- DROP POLICY IF EXISTS "tasks_update_own" ON tasks;
-- DROP POLICY IF EXISTS "tasks_insert_own" ON tasks;
-- DROP POLICY IF EXISTS "tasks_select_own" ON tasks;
-- ALTER TABLE events DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "events_delete_own" ON events;
-- DROP POLICY IF EXISTS "events_update_official" ON events;
-- DROP POLICY IF EXISTS "events_update_own" ON events;
-- DROP POLICY IF EXISTS "events_insert_service" ON events;
-- DROP POLICY IF EXISTS "events_insert_own" ON events;
-- DROP POLICY IF EXISTS "events_select_cohort_shared" ON events;
-- DROP POLICY IF EXISTS "events_select_own" ON events;
-- ============================================================
