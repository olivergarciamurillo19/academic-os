"use client";

import { mockSubjects, subjectColorVar } from "@/features/subjects/mock-data";
import { cn } from "@/lib/utils";

interface SubjectFilterProps {
  visible: ReadonlySet<string>;
  onToggle: (subjectId: string) => void;
  onAll: () => void;
  onNone: () => void;
}

export function SubjectFilter({ visible, onToggle, onAll, onNone }: SubjectFilterProps) {
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
      {mockSubjects.map((s) => {
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
                ? { backgroundColor: `color-mix(in oklch, ${subjectColorVar(s.colorIndex)} 20%, transparent)` }
                : undefined
            }
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: subjectColorVar(s.colorIndex) }}
            />
            {s.shortName}
          </button>
        );
      })}
    </div>
  );
}
