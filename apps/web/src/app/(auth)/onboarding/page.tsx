import { redirect } from "next/navigation";

import { nextIncompleteStep, readOnboardingState } from "@/features/onboarding/state";

export default async function OnboardingEntryPage() {
  const state = await readOnboardingState();
  const step = nextIncompleteStep(state);
  redirect(`/onboarding/step-${step}`);
}
