import "server-only";

import { db, subjectMembers, subjects, topics } from "@academic-os/db";
import { and, eq } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

import { mockSubjects, type MockSubject, type SubjectSemester } from "./mock-data";

type SubjectRow = typeof subjects.$inferSelect;

/**
 * Stable mapping from a subject code to one of the 10 --color-subject-*
 * palette indexes. Uses a simple deterministic hash so the same subject
 * always lands on the same color across server and client renders.
 */
function colorIndexFor(code: string): MockSubject["colorIndex"] {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const idx = ((hash % 10) + 1) as MockSubject["colorIndex"];
  return idx;
}

function semesterOf(row: SubjectRow): SubjectSemester {
  return row.semester === 2 ? "2Q" : "1Q";
}

function shortNameFrom(name: string): string {
  if (name.length <= 20) return name;
  return `${name.slice(0, 18).trim()}…`;
}

function rowToUi(row: SubjectRow): MockSubject {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: shortNameFrom(row.name),
    credits: row.credits ?? 6,
    semester: semesterOf(row),
    colorIndex: colorIndexFor(row.code),
    color: row.color ?? undefined,
    // nextEvent left undefined — wired once the events table is queryable
    // in the subject scope (next issue after this one).
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Listing query for the subjects grid.
 *
 * Queries subjects the user is enrolled in via subject_members, so the
 * list is stable across cohort changes and independent of the
 * active_cohort_id cookie. Returns [] when the user has no enrolments
 * (the UI renders an empty state). Mocks are only used in demo mode
 * (Supabase unconfigured) or when no session is found.
 */
export async function listSubjectsForActiveUser(): Promise<readonly MockSubject[]> {
  if (!isSupabaseConfigured()) return mockSubjects;
  const session = await getSessionUser();
  if (!session) return [];

  try {
    const rows = await db
      .select({
        id: subjects.id,
        cohortId: subjects.cohortId,
        universityId: subjects.universityId,
        code: subjects.code,
        name: subjects.name,
        color: subjects.color,
        credits: subjects.credits,
        semester: subjects.semester,
        isActive: subjects.isActive,
        createdAt: subjects.createdAt,
      })
      .from(subjectMembers)
      .innerJoin(subjects, eq(subjectMembers.subjectId, subjects.id))
      .where(
        and(
          eq(subjectMembers.userId, session.user.id),
          eq(subjects.isActive, true),
        ),
      );
    return rows.map(rowToUi);
  } catch (err) {
    console.error("[subjects.listSubjectsForActiveUser] drizzle query failed:", err);
    return [];
  }
}

export async function getSubjectByIdForActiveUser(
  subjectId: string,
): Promise<MockSubject | null> {
  if (!isSupabaseConfigured()) {
    return mockSubjects.find((s) => s.id === subjectId) ?? null;
  }
  if (!UUID_RE.test(subjectId)) return null;
  try {
    const rows = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    const row = rows[0];
    return row ? rowToUi(row) : null;
  } catch (err) {
    console.error("[subjects.getSubjectByIdForActiveUser] drizzle query failed:", err);
    return null;
  }
}

export interface TopicRow {
  id: string;
  name: string;
  kind: "theory" | "practice" | "lab" | "exam_unit";
  orderIndex: number;
}

export async function listTopicsForSubject(subjectId: string): Promise<readonly TopicRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const rows = await db
      .select({
        id: topics.id,
        name: topics.name,
        kind: topics.kind,
        orderIndex: topics.orderIndex,
      })
      .from(topics)
      .where(eq(topics.subjectId, subjectId));
    return rows.sort((a, b) => a.orderIndex - b.orderIndex);
  } catch (err) {
    console.error("[subjects.listTopicsForSubject] drizzle query failed:", err);
    return [];
  }
}
