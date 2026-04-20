-- ============================================================
-- RLS Helper Functions
-- ============================================================
-- All functions are SECURITY DEFINER to avoid recursive RLS evaluation.
-- Revertible: DROP FUNCTION IF EXISTS

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

-- Returns all active cohort IDs for the current user.
-- Used in RLS to avoid N+1 subquery expansion.
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

-- Returns true if the user has role 'admin' or 'delegate' in the given cohort.
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

-- DOWN (run to revert):
-- DROP FUNCTION IF EXISTS is_cohort_member(uuid);
-- DROP FUNCTION IF EXISTS my_active_cohort_ids();
-- DROP FUNCTION IF EXISTS is_cohort_manager(uuid);
