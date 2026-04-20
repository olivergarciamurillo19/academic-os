-- ============================================================
-- RLS Policies: AI tables (chunks, conversations, messages, tests, attempts)
-- Requires: helpers.sql (is_cohort_member)
-- ============================================================
-- Revertible: run DOWN block at end.

-- ─── chunks ──────────────────────────────────────────────────────────────────
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Users only see chunks for subjects in their cohort
CREATE POLICY "chunks_select_cohort_member"
  ON chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = chunks.subject_id
        AND is_cohort_member(s.cohort_id)
    )
  );

-- Service_role manages chunk ingestion
CREATE POLICY "chunks_insert_service"
  ON chunks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "chunks_delete_service"
  ON chunks FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── conversations ───────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users only see their own conversations
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── messages ────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users see messages of their own conversations
CREATE POLICY "messages_select_own_conversation"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- Service_role inserts messages (LLM responses are server-side)
CREATE POLICY "messages_insert_service"
  ON messages FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "messages_delete_service"
  ON messages FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── generated_tests ─────────────────────────────────────────────────────────
ALTER TABLE generated_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_tests_select_own"
  ON generated_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "generated_tests_insert_service"
  ON generated_tests FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "generated_tests_delete_own"
  ON generated_tests FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ─── test_attempts ───────────────────────────────────────────────────────────
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_attempts_select_own"
  ON test_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "test_attempts_insert_own"
  ON test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "test_attempts_update_own"
  ON test_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DOWN:
-- ALTER TABLE test_attempts DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "test_attempts_update_own" ON test_attempts;
-- DROP POLICY IF EXISTS "test_attempts_insert_own" ON test_attempts;
-- DROP POLICY IF EXISTS "test_attempts_select_own" ON test_attempts;
-- ALTER TABLE generated_tests DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "generated_tests_delete_own" ON generated_tests;
-- DROP POLICY IF EXISTS "generated_tests_insert_service" ON generated_tests;
-- DROP POLICY IF EXISTS "generated_tests_select_own" ON generated_tests;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "messages_delete_service" ON messages;
-- DROP POLICY IF EXISTS "messages_insert_service" ON messages;
-- DROP POLICY IF EXISTS "messages_select_own_conversation" ON messages;
-- ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "conversations_delete_own" ON conversations;
-- DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
-- DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
-- DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
-- ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "chunks_delete_service" ON chunks;
-- DROP POLICY IF EXISTS "chunks_insert_service" ON chunks;
-- DROP POLICY IF EXISTS "chunks_select_cohort_member" ON chunks;
-- ============================================================
