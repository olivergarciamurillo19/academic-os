"use server";

import {
  db,
  subjectMembers,
  subjects,
} from "@academic-os/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const HEX = /^#[0-9a-f]{6}$/i;

export async function updateSubjectColor(input: {
  subjectId: string;
  color: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado" };
  const parsed = z
    .object({
      subjectId: z.string().uuid(),
      color: z.string().regex(HEX, "Color inválido"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Inválido" };

  // Only allow changing color on subjects the user is enrolled in.
  const [member] = await db
    .select({ id: subjectMembers.id })
    .from(subjectMembers)
    .where(
      and(
        eq(subjectMembers.userId, session.user.id),
        eq(subjectMembers.subjectId, parsed.data.subjectId),
      ),
    )
    .limit(1);
  if (!member) return { ok: false, message: "Asignatura no encontrada" };

  await db
    .update(subjects)
    .set({ color: parsed.data.color })
    .where(eq(subjects.id, parsed.data.subjectId));
  revalidatePath("/subjects");
  revalidatePath(`/subjects/${parsed.data.subjectId}`);
  return { ok: true };
}
