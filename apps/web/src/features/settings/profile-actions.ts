"use server";

import { db, users } from "@academic-os/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export interface ProfileState {
  id: string;
  email: string;
  fullName: string | null;
}

export async function getProfile(): Promise<ProfileState | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      fullName: null,
    };
  }
  return row;
}

export async function updateProfile(
  input: ProfileInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado" };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Nombre inválido" };
  }
  await db
    .update(users)
    .set({ fullName: parsed.data.fullName })
    .where(eq(users.id, session.user.id));
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
