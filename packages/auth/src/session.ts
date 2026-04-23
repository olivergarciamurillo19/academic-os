import type { SupabaseClient, User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MembershipRole = "student" | "delegate" | "admin";

export type MembershipStatus = "active" | "inactive" | "suspended" | "pending";

export interface ActiveMembership {
  id: string;
  userId: string;
  universityId: string;
  degreeProgramId: string;
  cohortId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface SessionUser {
  user: User;
  activeMembership: ActiveMembership | null;
}

// ─── Shape of a membership row returned from Supabase ─────────────────────────

interface MembershipRow {
  id: string;
  user_id: string;
  university_id: string;
  degree_program_id: string;
  cohort_id: string;
  role: string;
  status: string;
}

function isMembershipRole(value: string): value is MembershipRole {
  return value === "student" || value === "delegate" || value === "admin";
}

function isMembershipStatus(value: string): value is MembershipStatus {
  return (
    value === "active" ||
    value === "inactive" ||
    value === "suspended" ||
    value === "pending"
  );
}

function rowToActiveMembership(row: MembershipRow): ActiveMembership | null {
  if (!isMembershipRole(row.role) || !isMembershipStatus(row.status)) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    universityId: row.university_id,
    degreeProgramId: row.degree_program_id,
    cohortId: row.cohort_id,
    role: row.role,
    status: row.status,
  };
}

// ─── Session helper ───────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user together with their active membership.
 *
 * Returns `null` when the user is not authenticated.
 * Returns a `SessionUser` with `activeMembership: null` when the user is
 * authenticated but has no active membership row.
 *
 * @param supabaseClient - A typed Supabase client (browser or server).
 */
export async function getSessionUser(
  supabaseClient: SupabaseClient,
): Promise<SessionUser | null> {
  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError !== null || user === null) {
    return null;
  }

  const { data: membershipRows, error: membershipError } =
    await supabaseClient
      .from("memberships")
      .select(
        "id, user_id, university_id, degree_program_id, cohort_id, role, status",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1);

  if (membershipError !== null) {
    // Log the error but still return the authenticated user without a membership
    // rather than failing the entire request.
    console.error("[auth] Failed to fetch membership:", membershipError.message);
    return { user, activeMembership: null };
  }

  const firstRow = membershipRows?.[0];
  const activeMembership =
    firstRow !== undefined ? rowToActiveMembership(firstRow as MembershipRow) : null;

  return { user, activeMembership };
}
