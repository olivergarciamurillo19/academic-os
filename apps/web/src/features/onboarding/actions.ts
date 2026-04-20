"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearOnboardingState,
  readOnboardingState,
  writeOnboardingState,
} from "./state";

const step1Schema = z.object({
  universitySlug: z.literal("ual"),
});

const step2Schema = z.object({
  degreeCode: z.enum(["441", "442"]),
  year: z.coerce.number().int().min(1).max(4),
});

const step3Schema = z.object({
  selectedSubjectIds: z.array(z.string().min(1)).min(1, {
    message: "Selecciona al menos una asignatura.",
  }),
});

export async function saveStep1(formData: FormData): Promise<void> {
  const parsed = step1Schema.parse({
    universitySlug: formData.get("universitySlug"),
  });
  const current = await readOnboardingState();
  await writeOnboardingState({ ...current, ...parsed, step: 2 });
  redirect("/onboarding/step-2");
}

export async function saveStep2(formData: FormData): Promise<void> {
  const parsed = step2Schema.parse({
    degreeCode: formData.get("degreeCode"),
    year: formData.get("year"),
  });
  const current = await readOnboardingState();
  await writeOnboardingState({ ...current, ...parsed, step: 3 });
  redirect("/onboarding/step-3");
}

export async function completeOnboarding(formData: FormData): Promise<void> {
  const selectedSubjectIds = formData.getAll("subjects").map(String);
  step3Schema.parse({ selectedSubjectIds });

  const current = await readOnboardingState();
  await writeOnboardingState({ ...current, selectedSubjectIds, step: 3 });

  // TODO(backend): persist via Drizzle once Armando lands user_profile / enrollments tables.
  // TODO(analytics): emit onboarding_completed from a client action wrapper,
  // since server actions can't reach posthog-js. Tracked by Issue #25 follow-up.
  await clearOnboardingState();

  redirect("/dashboard");
}
