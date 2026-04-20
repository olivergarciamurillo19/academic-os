import { cookies } from "next/headers";
import { z } from "zod";

/**
 * Cookie-backed onboarding progress. Lets a user resume mid-flow without a DB.
 * Will be swapped for a `user_profile` row once Armando's Supabase Auth lands.
 */

export const ONBOARDING_COOKIE = "academic_os_onboarding";

const onboardingStateSchema = z.object({
  step: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  universitySlug: z.string().optional(),
  degreeCode: z.enum(["441", "442"]).optional(),
  year: z.number().int().min(1).max(4).optional(),
  selectedSubjectIds: z.array(z.string()).optional(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export async function readOnboardingState(): Promise<OnboardingState> {
  const store = await cookies();
  const raw = store.get(ONBOARDING_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = onboardingStateSchema.safeParse(parsed);
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

export async function writeOnboardingState(next: OnboardingState): Promise<void> {
  const store = await cookies();
  store.set({
    name: ONBOARDING_COOKIE,
    value: JSON.stringify(next),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearOnboardingState(): Promise<void> {
  const store = await cookies();
  store.delete(ONBOARDING_COOKIE);
}

/** Derive the next step to resume at, given what's stored. */
export function nextIncompleteStep(state: OnboardingState): 1 | 2 | 3 {
  if (!state.universitySlug) return 1;
  if (!state.degreeCode || !state.year) return 2;
  return 3;
}
