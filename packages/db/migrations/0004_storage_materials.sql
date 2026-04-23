-- Migration 0004: Supabase Storage — materials bucket + policies
--
-- Bucket: `materials` (private). Files are stored under the path
--   {userId}/{subjectId}/{resourceId}/{filename}
-- so RLS policies can authorise by the first path segment.
--
-- Run order: after 0003_rls_materials_calendar_ai.sql.

-- ─── 1. Create bucket (idempotent) ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false,
  52428800, -- 50 MiB
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. Drop any pre-existing policies with these names ───────────────────────
DROP POLICY IF EXISTS "materials_insert_own_path" ON storage.objects;
DROP POLICY IF EXISTS "materials_select_own_path" ON storage.objects;
DROP POLICY IF EXISTS "materials_update_own_path" ON storage.objects;
DROP POLICY IF EXISTS "materials_delete_own_path" ON storage.objects;
DROP POLICY IF EXISTS "materials_service_role_all" ON storage.objects;

-- ─── 3. Policies: owner scoped by first path segment (userId) ─────────────────
CREATE POLICY "materials_insert_own_path"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "materials_select_own_path"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "materials_update_own_path"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "materials_delete_own_path"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role bypasses RLS implicitly; this policy makes intent explicit
-- for any code path that authenticates as service_role via PostgREST.
CREATE POLICY "materials_service_role_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'materials' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'materials' AND auth.role() = 'service_role');

-- ─── DOWN ─────────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "materials_insert_own_path" ON storage.objects;
-- DROP POLICY IF EXISTS "materials_select_own_path" ON storage.objects;
-- DROP POLICY IF EXISTS "materials_update_own_path" ON storage.objects;
-- DROP POLICY IF EXISTS "materials_delete_own_path" ON storage.objects;
-- DROP POLICY IF EXISTS "materials_service_role_all" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'materials';
