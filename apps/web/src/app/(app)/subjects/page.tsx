import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

import { LoadingSkeleton } from "@/components/brand/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  SubjectsFilterPills,
  type SemesterFilter,
} from "@/features/subjects/filter-pills";
import { getCurrentSemester, mockSubjects } from "@/features/subjects/mock-data";
import { SubjectCard } from "@/features/subjects/subject-card";

export const metadata: Metadata = {
  title: "Asignaturas",
};

function normalizeFilter(value: string | string[] | undefined): SemesterFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "1Q" || raw === "2Q") return raw;
  return "all";
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string | string[] }>;
}) {
  const params = await searchParams;
  const filter = normalizeFilter(params.semester);
  const semester = filter === "all" ? null : filter;

  const filtered = semester
    ? mockSubjects.filter((s) => s.semester === semester)
    : mockSubjects;

  const counts: Record<SemesterFilter, number> = {
    all: mockSubjects.length,
    "1Q": mockSubjects.filter((s) => s.semester === "1Q").length,
    "2Q": mockSubjects.filter((s) => s.semester === "2Q").length,
  };

  const current = getCurrentSemester();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Asignaturas</h1>
          <p className="text-sm text-muted-foreground">
            {mockSubjects.length} asignaturas en tu matrícula · cuatrimestre actual {current}
          </p>
        </div>
        <SubjectsFilterPills current={filter} counts={counts} />
      </header>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <section
          aria-label="Lista de asignaturas"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
      </span>
      <CardContent className="flex flex-col items-center gap-1 px-6">
        <p className="text-base font-medium">Sin asignaturas en este cuatrimestre</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ajusta el filtro o añade asignaturas desde ajustes de matrícula.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Exported for use in streaming boundaries (suspense fallbacks).
 * Not rendered directly on this page yet; kept colocated for Issue #17
 * and future backend migration.
 */
export function SubjectsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="card" />
      ))}
    </div>
  );
}
