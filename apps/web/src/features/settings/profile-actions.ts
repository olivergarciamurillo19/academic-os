"use server";

import { db, users } from "@academic-os/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { getServiceRoleSupabase, hasServiceRoleKey } from "@/lib/supabase-admin";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export interface ProfileState {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const AVATAR_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function getProfile(): Promise<ProfileState | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!row) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      fullName: null,
      avatarUrl: null,
    };
  }
  return row;
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Falta archivo" };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Máximo 5 MB" };
  }
  if (!AVATAR_MIMES.has(file.type)) {
    return { ok: false, message: "Tipo no permitido (png, jpg, webp)" };
  }
  if (!hasServiceRoleKey()) {
    return { ok: false, message: "Storage no configurado" };
  }
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${session.user.id}/avatar.${ext}`;
  const admin = getServiceRoleSupabase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("[profile.uploadAvatar] storage failed:", uploadError.message);
    return { ok: false, message: "No se pudo subir el avatar" };
  }
  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now().toString()}`;
  await db
    .update(users)
    .set({ avatarUrl: url })
    .where(eq(users.id, session.user.id));
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true, url };
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
