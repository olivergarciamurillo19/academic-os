import { CheckCircle2, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveStep1 } from "@/features/onboarding/actions";
import { OnboardingProgress } from "@/features/onboarding/progress";
import { readOnboardingState } from "@/features/onboarding/state";

export default async function OnboardingStep1() {
  const state = await readOnboardingState();
  const selected = state.universitySlug ?? "ual";

  return (
    <div className="flex flex-col gap-6">
      <OnboardingProgress step={1} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">¿En qué universidad estudias?</h1>
        <p className="text-sm text-muted-foreground">
          Empezamos por la UAL. Añadiremos más universidades según pidas.
        </p>
      </div>

      <form action={saveStep1} className="flex flex-col gap-4">
        <Card className="flex flex-row items-center gap-4 p-5">
          <input type="hidden" name="universitySlug" value="ual" />
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardContent className="flex-1 p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Universidad de Almería</span>
                <span className="text-xs text-muted-foreground">ual.es · España</span>
              </div>
              {selected === "ual" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Seleccionada
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="self-end">
          Continuar
        </Button>
      </form>
    </div>
  );
}
