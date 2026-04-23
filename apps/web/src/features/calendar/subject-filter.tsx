"use client";

import { useSubjectsForActiveUser } from "@/features/subjects/use-subjects";
import { cn } from "@/lib/utils";

interface SubjectFilterProps {
  visible: ReadonlySet<string>;
  onToggle: (subjectId: string) => void;
  onAll: () => void;
  onNone: () => void;
}

export function SubjectFilter({ visible, onToggle, onAll, onNone }: SubjectFilterProps) {
  const subjects = useSubjectsForActiveUser();
  if (subjects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Sin asignaturas. Termina el onboarding para filtrar por asignatura.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onAll}
        className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Todas
      </button>
      <button
        type="button"
        onClick={onNone}
        className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Ninguna
      </button>
      {subjects.map((s) => {
        const active = visible.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-transparent text-foreground"
                : "border-dashed text-muted-foreground opacity-60 hover:opacity-100",
            )}
            style={
              active
                ? { backgroundColor: `color-mix(in oklch, ${s.color} 20%, transparent)` }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.shortName}
          </button>
        );
      })}
    </div>
  );
}
