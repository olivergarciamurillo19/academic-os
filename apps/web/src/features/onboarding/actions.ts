"use server";

import {
  cohorts,
  db,
  degreePrograms,
  integrations,
  memberships,
  subjectMembers,
  subjects,
  universities,
  users,
} from "@academic-os/db";
import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";

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

/** Academic year label compatible with Armando's seed (e.g. "2025/26"). */
function currentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 8) {
    return `${year}/${((year + 1) % 100).toString().padStart(2, "0")}`;
  }
  const start = year - 1;
  const end = year % 100;
  return `${start}/${end.toString().padStart(2, "0")}`;
}

function currentPeriod(now: Date = new Date()): "1Q" | "2Q" {
  const month = now.getMonth();
  // Feb–Jun (1..5) → 2Q; rest → 1Q.
  return month >= 1 && month <= 5 ? "2Q" : "1Q";
}

export async function completeOnboarding(formData: FormData): Promise<void> {
  const selectedSubjectIds = formData.getAll("subjects").map(String);
  step3Schema.parse({ selectedSubjectIds });

  const rawIcal = String(formData.get("icalUrl") ?? "").trim();
  const icalUrl = rawIcal.length > 0 ? rawIcal.replace(/^webcal:\/\//i, "https://") : null;

  const current = await readOnboardingState();
  await writeOnboardingState({ ...current, selectedSubjectIds, step: 3 });

  const session = await getSessionUser();
  if (!session) {
    // Not authenticated yet — bounce to /login preserving the flow.
    redirect("/login?next=/onboarding");
  }

  const universitySlug = current.universitySlug ?? "ual";
  const degreeCode = current.degreeCode;
  if (!degreeCode) {
    redirect("/onboarding/step-2");
  }

  // 1. Ensure users row (Armando's auth trigger usually creates it; we
  //    upsert defensively).
  await db
    .insert(users)
    .values({
      id: session.user.id,
      email: session.user.email ?? `${session.user.id}@unknown.local`,
      fullName:
        (session.user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl:
        (session.user.user_metadata?.avatar_url as string | undefined) ?? null,
    })
    .onConflictDoNothing({ target: users.id });

  // 2. Resolve university + degree + cohort.
  const [uni] = await db
    .select({ id: universities.id })
    .from(universities)
    .where(eq(universities.slug, universitySlug))
    .limit(1);
  if (!uni) {
    throw new Error(`University "${universitySlug}" not seeded`);
  }

  const [degree] = await db
    .select({ id: degreePrograms.id })
    .from(degreePrograms)
    .where(
      and(eq(degreePrograms.universityId, uni.id), eq(degreePrograms.code, degreeCode)),
    )
    .limit(1);
  if (!degree) {
    throw new Error(`Degree "${degreeCode}" not seeded for ${universitySlug}`);
  }

  const academicYear = currentAcademicYear();
  const period = currentPeriod();

  const [cohort] = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(
      and(
        eq(cohorts.degreeProgramId, degree.id),
        eq(cohorts.academicYear, academicYear),
        eq(cohorts.period, period),
      ),
    )
    .limit(1);
  if (!cohort) {
    throw new Error(
      `Cohort ${academicYear} ${period} not seeded for degree ${degreeCode}. Run db:seed first.`,
    );
  }

  // 3. Upsert membership (unique per user+cohort).
  await db
    .insert(memberships)
    .values({
      userId: session.user.id,
      universityId: uni.id,
      degreeProgramId: degree.id,
      cohortId: cohort.id,
      role: "student",
      status: "active",
    })
    .onConflictDoUpdate({
      target: [memberships.userId, memberships.cohortId],
      set: { status: "active", role: "student" },
    });

  // 4. Enroll the user in the chosen subjects.
  if (selectedSubjectIds.length > 0) {
    const validSubjects = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(
        and(eq(subjects.cohortId, cohort.id), inArray(subjects.id, selectedSubjectIds)),
      );
    if (validSubjects.length > 0) {
      await db
        .insert(subjectMembers)
        .values(
          validSubjects.map((s) => ({
            userId: session.user.id,
            subjectId: s.id,
            role: "student" as const,
          })),
        )
        .onConflictDoNothing({ target: [subjectMembers.subjectId, subjectMembers.userId] });
    }
  }

  // 5. Optional iCal — save + trigger immediate sync.
  if (icalUrl && /^https?:\/\//i.test(icalUrl)) {
    try {
      const existing = await db.query.integrations.findFirst({
        where: and(
          eq(integrations.userId, session.user.id),
          eq(integrations.provider, "ical_url"),
        ),
      });
      let integrationId: string;
      if (existing) {
        integrationId = existing.id;
        await db
          .update(integrations)
          .set({
            isActive: true,
            metadata: { ...(existing.metadata ?? {}), url: icalUrl },
          })
          .where(eq(integrations.id, existing.id));
      } else {
        const [inserted] = await db
          .insert(integrations)
          .values({
            userId: session.user.id,
            provider: "ical_url",
            metadata: { url: icalUrl },
            isActive: true,
          })
          .returning({ id: integrations.id });
        integrationId = inserted?.id ?? "";
      }
      if (integrationId && process.env.INNGEST_EVENT_KEY) {
        await inngest
          .send({
            name: "ical.sync.requested",
            data: { userId: session.user.id, integrationId },
          })
          .catch((err: unknown) => {
            console.warn("[onboarding] ical inngest.send failed:", err);
          });
      }
    } catch (err) {
      console.warn("[onboarding] ical setup failed:", err);
    }
  }

  // 6. Set active_cohort_id cookie so middleware lets /dashboard through.
  const store = await cookies();
  store.set({
    name: "active_cohort_id",
    value: cohort.id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  await clearOnboardingState();

  redirect("/dashboard");
}
