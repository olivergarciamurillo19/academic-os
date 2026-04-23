"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

export type SemesterFilter = "all" | "1Q" | "2Q";

const filters: readonly { value: SemesterFilter; label: string }[] = [
  { value: "1Q", label: "1Q" },
  { value: "2Q", label: "2Q" },
  { value: "all", label: "Todas" },
];

interface FilterPillsProps {
  current: SemesterFilter;
  counts: Record<SemesterFilter, number>;
}

export function SubjectsFilterPills({ current, counts }: FilterPillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setFilter(next: SemesterFilter) {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("semester");
    else params.set("semester", next);
    const qs = params.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Filtrar por cuatrimestre"
      className="inline-flex rounded-full border bg-background p-1 text-sm"
    >
      {filters.map((f) => {
        const active = current === f.value;
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFilter(f.value)}
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
