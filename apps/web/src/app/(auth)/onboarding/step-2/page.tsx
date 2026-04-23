import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveStep2 } from "@/features/onboarding/actions";
import { OnboardingProgress } from "@/features/onboarding/progress";
import { readOnboardingState } from "@/features/onboarding/state";

const degrees = [
  {
    code: "441",
    name: "Grado en Ingeniería Mecánica",
    blurb: "Ciclo: 1º–4º · Campus de Almería",
  },
  {
    code: "442",
    name: "Grado en Ingeniería Electrónica Industrial",
    blurb: "Ciclo: 1º–4º · Campus de Almería",
  },
] as const;

const years = [1, 2, 3, 4] as const;

export default async function OnboardingStep2() {
  const state = await readOnboardingState();
  const selectedDegree = state.degreeCode ?? "441";
  const selectedYear = state.year ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <OnboardingProgress step={2} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">¿Qué grado y año?</h1>
        <p className="text-sm text-muted-foreground">
          Esto nos ayuda a cargar las asignaturas reales de tu plan de estudios.
        </p>
      </div>

      <form action={saveStep2} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Grado</legend>
          {degrees.map((deg) => {
            const active = selectedDegree === deg.code;
            return (
              <label key={deg.code} className="cursor-pointer">
                <input
                  type="radio"
                  name="degreeCode"
                  value={deg.code}
                  defaultChecked={active}
                  className="peer sr-only"
                  required
                />
                <Card className="p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  <CardContent className="flex items-center justify-between gap-3 p-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{deg.name}</span>
                      <span className="text-xs text-muted-foreground">{deg.blurb}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Código {deg.code}
                    </span>
                  </CardContent>
                </Card>
              </label>
            );
          })}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Año académico</legend>
          <div className="grid grid-cols-4 gap-2">
            {years.map((year) => {
              const active = selectedYear === year;
              return (
                <label key={year} className="cursor-pointer">
                  <input
                    type="radio"
                    name="year"
                    value={year}
                    defaultChecked={active}
                    className="peer sr-only"
                    required
                  />
                  <span className="flex h-11 items-center justify-center rounded-md border bg-background text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    {year}º
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={{ pathname: "/onboarding/step-1" }}>Atrás</Link>
          </Button>
          <Button type="submit" size="lg">
            Continuar
          </Button>
        </div>
      </form>
    </div>
  );
}
