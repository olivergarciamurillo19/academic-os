"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, integrations } from "@academic-os/db";

import { getSessionUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";

const icalUrlSchema = z.object({
  url: z
    .string()
    .min(10)
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u) || /^webcal:\/\//i.test(u), {
      message: "La URL debe empezar por http(s):// o webcal://",
    }),
});

export interface IcalIntegrationState {
  id: string;
  url: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

export async function getIcalIntegration(): Promise<IcalIntegrationState | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.provider, "ical_url"),
    ),
    orderBy: desc(integrations.createdAt),
  });
  if (!row) return null;

  const meta = (row.metadata ?? {}) as { url?: string; lastSyncAt?: string };
  return {
    id: row.id,
    url: typeof meta.url === "string" ? meta.url : "",
    isActive: row.isActive,
    lastSyncAt: typeof meta.lastSyncAt === "string" ? new Date(meta.lastSyncAt) : null,
    createdAt: row.createdAt,
  };
}

export async function saveIcalIntegration(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado." };

  const rawUrl = formData.get("url");
  const parsed = icalUrlSchema.safeParse({ url: rawUrl });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "URL inválida." };
  }

  // Normalise webcal → https so `fetch()` works in the sync job.
  const normalised = parsed.data.url.replace(/^webcal:\/\//i, "https://");

  const existing = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, session.user.id),
      eq(integrations.provider, "ical_url"),
    ),
  });

  let id: string;
  if (existing) {
    id = existing.id;
    await db
      .update(integrations)
      .set({
        isActive: true,
        metadata: { ...(existing.metadata ?? {}), url: normalised },
      })
      .where(eq(integrations.id, existing.id));
  } else {
    const [inserted] = await db
      .insert(integrations)
      .values({
        userId: session.user.id,
        provider: "ical_url",
        metadata: { url: normalised },
        isActive: true,
      })
      .returning({ id: integrations.id });
    if (!inserted) return { ok: false, message: "No se pudo guardar." };
    id = inserted.id;
  }

  // Fire-and-forget: trigger an immediate sync.
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({
        name: "ical.sync.requested",
        data: { userId: session.user.id, integrationId: id },
      });
    } catch (err) {
      console.warn("[settings.integrations] inngest.send failed:", err);
    }
  }

  revalidatePath("/settings/integrations");
  return { ok: true, id };
}

export async function disconnectIcalIntegration(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado." };

  await db
    .update(integrations)
    .set({ isActive: false })
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.provider, "ical_url"),
      ),
    );

  revalidatePath("/settings/integrations");
  return { ok: true };
}
