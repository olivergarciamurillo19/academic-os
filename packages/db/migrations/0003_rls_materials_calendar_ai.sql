-- Migration 0003: RLS policies for materials, calendar, AI tables
--                 + HNSW/GIN indexes for vector search
--                 + auth trigger: on_auth_user_created
-- Reversible: see DOWN block.

-- ─── HNSW + GIN indexes (require vector extension) ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON chunks USING gin(to_tsvector('spanish', content));

-- ─── Auth trigger: sync auth.users → public.users ────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ─── resources ───────────────────────────────────────────────────────────────
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_select_personal" ON resources FOR SELECT USING (owner_user_id = auth.uid() AND scope = 'personal');
CREATE POLICY "resources_select_shared" ON resources FOR SELECT
  USING (scope IN ('subject_shared', 'cohort_shared') AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = resources.subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "resources_insert_own" ON resources FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "resources_update_own" ON resources FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "resources_delete_own" ON resources FOR DELETE USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');

-- ─── documents ───────────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_owner" ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM resources r WHERE r.id = documents.resource_id AND r.owner_user_id = auth.uid()));
CREATE POLICY "documents_insert_service" ON documents FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "documents_update_service" ON documents FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "documents_delete_service" ON documents FOR DELETE USING (auth.role() = 'service_role');

-- ─── events ──────────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_own" ON events FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "events_select_cohort_shared" ON events FOR SELECT
  USING (cohort_id IS NOT NULL AND is_official = true AND is_cohort_member(cohort_id));
CREATE POLICY "events_insert_own" ON events FOR INSERT WITH CHECK (auth.uid() = owner_user_id AND is_official = false);
CREATE POLICY "events_insert_service" ON events FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "events_update_own" ON events FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "events_update_official" ON events FOR UPDATE USING (auth.role() = 'service_role' OR (cohort_id IS NOT NULL AND is_cohort_manager(cohort_id)));
CREATE POLICY "events_delete_own" ON events FOR DELETE USING (auth.uid() = owner_user_id OR auth.role() = 'service_role');

-- ─── tasks ───────────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select_own" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_own" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_own" ON tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_delete_own" ON tasks FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── reminders ───────────────────────────────────────────────────────────────
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_select_own" ON reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reminders_insert_service" ON reminders FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "reminders_update_service" ON reminders FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "reminders_delete_own" ON reminders FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── integrations ────────────────────────────────────────────────────────────
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_select_own" ON integrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "integrations_insert_service" ON integrations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "integrations_update_service" ON integrations FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "integrations_delete_own" ON integrations FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── chunks ──────────────────────────────────────────────────────────────────
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks_select_cohort_member" ON chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM subjects s WHERE s.id = chunks.subject_id AND is_cohort_member(s.cohort_id)));
CREATE POLICY "chunks_insert_service" ON chunks FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "chunks_delete_service" ON chunks FOR DELETE USING (auth.role() = 'service_role');

-- ─── conversations ───────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON conversations FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── messages ────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_own_conversation" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "messages_insert_service" ON messages FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "messages_delete_service" ON messages FOR DELETE USING (auth.role() = 'service_role');

-- ─── generated_tests ─────────────────────────────────────────────────────────
ALTER TABLE generated_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_tests_select_own" ON generated_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "generated_tests_insert_service" ON generated_tests FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "generated_tests_delete_own" ON generated_tests FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── test_attempts ───────────────────────────────────────────────────────────
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_attempts_select_own" ON test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "test_attempts_insert_own" ON test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "test_attempts_update_own" ON test_attempts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DOWN (summarized):
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_auth_user();
-- DROP INDEX IF EXISTS idx_chunks_embedding;
-- DROP INDEX IF EXISTS idx_chunks_fts;
-- [plus all DROP POLICY / DISABLE ROW LEVEL SECURITY from individual policy files]
-- ============================================================
