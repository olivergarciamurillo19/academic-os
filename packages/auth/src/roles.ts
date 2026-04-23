import type { ActiveMembership, MembershipRole } from "./session.js";

// ─── Role hierarchy ───────────────────────────────────────────────────────────

/**
 * Numeric weight for each role.
 * Higher value = more authority.
 */
const ROLE_WEIGHT: Record<MembershipRole, number> = {
  student: 0,
  delegate: 1,
  admin: 2,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks whether the provided membership satisfies the minimum required role.
 *
 * Returns `false` (does not throw) when:
 *  - `activeMembership` is null (unauthenticated / no membership)
 *  - the membership role is lower than `requiredRole` in the hierarchy
 *
 * @param requiredRole   - Minimum role needed to pass the check.
 * @param activeMembership - The caller's current membership, or null.
 */
export function requireRole(
  requiredRole: MembershipRole,
  activeMembership: ActiveMembership | null,
): boolean {
  if (activeMembership === null) {
    return false;
  }

  const actualWeight = ROLE_WEIGHT[activeMembership.role];
  const requiredWeight = ROLE_WEIGHT[requiredRole];

  return actualWeight >= requiredWeight;
}

/**
 * Returns true when the membership holder can manage cohort-level resources.
 *
 * Delegates and admins are allowed; plain students are not.
 *
 * @param membership - The caller's current membership, or null.
 */
export function canManageCohort(membership: ActiveMembership | null): boolean {
  return requireRole("delegate", membership);
}

// Re-export the type so consumers can import it from this module directly.
export type { MembershipRole };
