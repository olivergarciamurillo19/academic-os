import { cn } from "@/lib/utils";

interface ProgressProps {
  step: 1 | 2 | 3;
  total?: 3;
  className?: string;
}

const labels: Record<1 | 2 | 3, string> = {
  1: "Universidad",
  2: "Grado",
  3: "Asignaturas",
};

export function OnboardingProgress({ step, total = 3, className }: ProgressProps) {
  const percent = Math.round((step / total) * 100);
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-label="Progreso de onboarding">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Paso {step} de {total} · {labels[step]}
        </span>
        <span>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
