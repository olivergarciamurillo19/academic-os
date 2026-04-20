/**
 * Resolves the active cohort id for server components.
 *
 * Lookup order:
 *  1. `active_cohort_id` cookie set by the middleware (fast path).
 *  2. Active membership row from `getSessionUser()` (slow path).
 *
 * Returns `null` if the user has no active membership or Supabase is not
 * configured (mock mode).
 */

import { cookies } from "next/headers";
import { cache } from "react";

import { getSessionUser } from "./auth";
import { isSupabaseConfigured } from "./supabase";

export const getActiveCohortId = cache(async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  const store = await cookies();
  const fromCookie = store.get("active_cohort_id")?.value;
  if (fromCookie && fromCookie.length > 0) {
    return fromCookie;
  }

  const session = await getSessionUser();
  return session?.activeMembership?.cohortId ?? null;
});
