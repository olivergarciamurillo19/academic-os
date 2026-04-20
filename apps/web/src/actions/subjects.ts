"use server";

import {
  db,
  subjectMembers,
  subjects,
} from "@academic-os/db";
import { and, eq } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export interface UiSubject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  credits: number;
  semester: "1Q" | "2Q";
  color: string;
}

function shortNameFrom(name: string): string {
  if (name.length <= 20) return name;
  return `${name.slice(0, 18).trim()}…`;
}

export async function getSubjects(): Promise<UiSubject[]> {
  if (!isSupabaseConfigured()) return [];
  const session = await getSessionUser();
  if (!session) return [];
  const rows = await db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      credits: subjects.credits,
      color: subjects.color,
      semester: subjects.semester,
    })
    .from(subjectMembers)
    .innerJoin(subjects, eq(subjectMembers.subjectId, subjects.id))
    .where(
      and(eq(subjectMembers.userId, session.user.id), eq(subjects.isActive, true)),
    );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: shortNameFrom(r.name),
    credits: r.credits ?? 6,
    semester: r.semester === 2 ? "2Q" : "1Q",
    color: r.color ?? "#94a3b8",
  }));
}
