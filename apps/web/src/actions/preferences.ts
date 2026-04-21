"use server";

import { db, users } from "@academic-os/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

import {
  ACCENT_COLORS,
  DEFAULT_APPEARANCE,
  DENSITIES,
  FONTS,
  type AccentColor,
  type AppDensity,
  type AppFont,
  type AppearancePreferences,
} from "./preferences-types";

const preferencesSchema = z.object({
  accentColor: z.enum(ACCENT_COLORS).optional(),
  font: z.enum(FONTS).optional(),
  density: z.enum(DENSITIES).optional(),
});

function isAppearance(
  value: unknown,
): value is Partial<AppearancePreferences> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (
    v.accentColor !== undefined &&
    !ACCENT_COLORS.includes(v.accentColor as AccentColor)
  )
    return false;
  if (v.font !== undefined && !FONTS.includes(v.font as AppFont)) return false;
  if (
    v.density !== undefined &&
    !DENSITIES.includes(v.density as AppDensity)
  )
    return false;
  return true;
}

export async function getAppearance(): Promise<AppearancePreferences> {
  const session = await getSessionUser();
  if (!session) return DEFAULT_APPEARANCE;
  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const prefs = row?.preferences;
  const appearance = prefs?.appearance;
  if (isAppearance(appearance)) {
    return {
      accentColor: appearance.accentColor ?? DEFAULT_APPEARANCE.accentColor,
      font: appearance.font ?? DEFAULT_APPEARANCE.font,
      density: appearance.density ?? DEFAULT_APPEARANCE.density,
    };
  }
  return DEFAULT_APPEARANCE;
}

export async function updateAppearance(
  input: Partial<AppearancePreferences>,
): Promise<{ ok: true; appearance: AppearancePreferences } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado" };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Preferencias inválidas" };

  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const existing = row?.preferences ?? {};
  const existingAppearance =
    isAppearance(existing.appearance) && existing.appearance
      ? existing.appearance
      : {};

  const next: AppearancePreferences = {
    accentColor:
      parsed.data.accentColor ??
      existingAppearance.accentColor ??
      DEFAULT_APPEARANCE.accentColor,
    font:
      parsed.data.font ?? existingAppearance.font ?? DEFAULT_APPEARANCE.font,
    density:
      parsed.data.density ??
      existingAppearance.density ??
      DEFAULT_APPEARANCE.density,
  };

  await db
    .update(users)
    .set({ preferences: { ...existing, appearance: next } })
    .where(eq(users.id, session.user.id));
  revalidatePath("/settings/appearance");
  revalidatePath("/", "layout");
  return { ok: true, appearance: next };
}
