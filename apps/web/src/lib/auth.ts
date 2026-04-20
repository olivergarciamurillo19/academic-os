import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  user: User;
  activeMembership: {
    id: string;
    cohortId: string;
    role: string;
  } | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ─── Shape returned from the memberships table ────────────────────────────────

interface MembershipRow {
  id: string;
  cohort_id: string;
  role: string;
}

function isMembershipRow(value: unknown): value is MembershipRow {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["cohort_id"] === "string" &&
    typeof v["role"] === "string"
  );
}

// ─── getSessionUser ───────────────────────────────────────────────────────────

/**
 * Returns the authenticated user together with their active membership.
 *
 * Memoised per request-scope with React `cache()` so multiple Server
 * Components in the same render tree share a single Supabase round-trip.
 *
 * Returns `null` when the user is not authenticated.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            } catch {
              // Server Components cannot set cookies; this is intentional.
            }
          }
        },
      },
    },
  );

  // ── Verify auth ────────────────────────────────────────────────────────────
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || userData.user === null) {
    return null;
  }

  const user = userData.user;

  // ── Fetch active membership ────────────────────────────────────────────────
  const { data: rows, error: membershipError } = await supabase
    .from("memberships")
    .select("id, cohort_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .limit(1);

  if (membershipError !== null) {
    console.error("[auth] getSessionUser — membership query failed:", membershipError.message);
    return { user, activeMembership: null };
  }

  const firstRow: unknown = rows?.[0];

  const activeMembership = isMembershipRow(firstRow)
    ? { id: firstRow.id, cohortId: firstRow.cohort_id, role: firstRow.role }
    : null;

  return { user, activeMembership };
});
