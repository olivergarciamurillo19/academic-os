import {
  cohorts,
  db,
  degreePrograms,
  subjects,
  universities,
} from "@academic-os/db";
import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeOnboarding } from "@/features/onboarding/actions";
import { OnboardingProgress } from "@/features/onboarding/progress";
import { readOnboardingState } from "@/features/onboarding/state";

type SubjectSemester = "1Q" | "2Q";

interface DbSubject {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  color: string | null;
  semester: number | null;
}

function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) {
    return `${year}/${((year + 1) % 100).toString().padStart(2, "0")}`;
  }
  return `${year - 1}/${(year % 100).toString().padStart(2, "0")}`;
}

function currentPeriod(now: Date = new Date()): SubjectSemester {
  const month = now.getMonth();
  return month >= 1 && month <= 5 ? "2Q" : "1Q";
}

async function loadSubjectsForDegree(
  universitySlug: string,
  degreeCode: string,
): Promise<{ q1: DbSubject[]; q2: DbSubject[] }> {
  const [uni] = await db
    .select({ id: universities.id })
    .from(universities)
    .where(eq(universities.slug, universitySlug))
    .limit(1);
  if (!uni) return { q1: [], q2: [] };

  const [deg] = await db
    .select({ id: degreePrograms.id })
    .from(degreePrograms)
    .where(
      and(
        eq(degreePrograms.universityId, uni.id),
        eq(degreePrograms.code, degreeCode),
      ),
    )
    .limit(1);
  if (!deg) return { q1: [], q2: [] };

  const academicYear = currentAcademicYear();
  const cohortRows = await db
    .select({ id: cohorts.id, period: cohorts.period })
    .from(cohorts)
    .where(
      and(
        eq(cohorts.degreeProgramId, deg.id),
        eq(cohorts.academicYear, academicYear),
      ),
    );
  const cohort1Q = cohortRows.find((c) => c.period === "1Q");
  const cohort2Q = cohortRows.find((c) => c.period === "2Q");

  const loadFor = async (cohortId: string | undefined): Promise<DbSubject[]> => {
    if (!cohortId) return [];
    return db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        credits: subjects.credits,
        color: subjects.color,
        semester: subjects.semester,
      })
      .from(subjects)
      .where(eq(subjects.cohortId, cohortId))
      .orderBy(asc(subjects.code));
  };

  const [q1, q2] = await Promise.all([loadFor(cohort1Q?.id), loadFor(cohort2Q?.id)]);
  return { q1, q2 };
}

export default async function OnboardingStep3() {
  const state = await readOnboardingState();
  if (!state.degreeCode) {
    redirect("/onboarding/step-2");
  }
  const universitySlug = state.universitySlug ?? "ual";

  const { q1, q2 } = await loadSubjectsForDegree(universitySlug, state.degreeCode);
  const semester = currentPeriod();
  const defaultGroup = semester === "1Q" ? q1 : q2;
  const previouslySelected = new Set(state.selectedSubjectIds ?? []);
  const picked =
    previouslySelected.size > 0
      ? previouslySelected
      : new Set(defaultGroup.map((s) => s.id));

  return (
    <div className="flex flex-col gap-6">
      <OnboardingProgress step={3} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Confirma tus asignaturas</h1>
        <p className="text-sm text-muted-foreground">
          Hemos precargado las del cuatrimestre actual ({semester}). Marca o desmarca según
          tu matrícula real.
        </p>
      </div>

      <form action={completeOnboarding} className="flex flex-col gap-6">
        <SubjectGroup
          title="Primer cuatrimestre"
          semester="1Q"
          active={semester === "1Q"}
          subjects={q1}
          picked={picked}
        />
        <SubjectGroup
          title="Segundo cuatrimestre"
          semester="2Q"
          active={semester === "2Q"}
          subjects={q2}
          picked={picked}
        />

        <IcalOptionalField />

        <div className="flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href={{ pathname: "/onboarding/step-2" }}>Atrás</Link>
          </Button>
          <Button type="submit" size="lg">
            Empezar
          </Button>
        </div>
      </form>
    </div>
  );
}

function IcalOptionalField() {
  return (
    <details className="rounded-md border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        ¿Tienes URL iCal del aula virtual? (opcional)
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          Si pegas la URL ahora, importamos tu calendario de Blackboard automáticamente.
          Podrás cambiarla o desconectarla luego en Ajustes → Integraciones.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-xs">
          <li>Blackboard UAL → Calendario → engranaje (⚙).</li>
          <li>Pulsa “Suscribirse al calendario”. Copia la URL <code className="rounded bg-muted px-1">webcal://…</code></li>
          <li>Pégala aquí. La sincronización se lanza al terminar.</li>
        </ol>
        <input
          type="url"
          name="icalUrl"
          placeholder="webcal://blackboard.ual.es/…"
          className="mt-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
    </details>
  );
}

function SubjectGroup({
  title,
  semester,
  active,
  subjects,
  picked,
}: {
  title: string;
  semester: SubjectSemester;
  active: boolean;
  subjects: DbSubject[];
  picked: Set<string>;
}) {
  if (subjects.length === 0) {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({semester})</span>
        </legend>
        <p className="text-xs text-muted-foreground">
          No hay asignaturas disponibles para este cuatrimestre.
        </p>
      </fieldset>
    );
  }
  return (
    <fieldset className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({semester})</span>
        </legend>
        {active && (
          <Badge variant="secondary" className="text-[10px] uppercase">
            Actual
          </Badge>
        )}
      </div>
      <div className="grid gap-2">
        {subjects.map((s) => {
          const checked = picked.has(s.id);
          return (
            <label key={s.id} className="cursor-pointer">
              <input
                type="checkbox"
                name="subjects"
                value={s.id}
                defaultChecked={checked}
                className="peer sr-only"
              />
              <Card className="p-3 transition-colors peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                <CardContent className="flex items-center gap-3 p-0">
                  <span
                    aria-hidden="true"
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color ?? "#94a3b8" }}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.code}
                      {s.credits != null ? ` · ${String(s.credits)} ECTS` : ""}
                    </span>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm border peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                    {checked && (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m3 8 3.5 3.5L13 4.5" />
                      </svg>
                    )}
                  </span>
                </CardContent>
              </Card>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
