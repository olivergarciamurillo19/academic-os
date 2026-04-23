"use server";

import {
  db,
  documents,
  resources,
  type resourceKindEnum,
} from "@academic-os/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { getServiceRoleSupabase, hasServiceRoleKey } from "@/lib/supabase-admin";

import {
  ACCEPTED_MIME_TYPES,
  MAX_RESOURCE_BYTES,
  kindForMime,
  type ResourceKind,
  type ResourceRecord,
  type TopicKind,
} from "./types";

const uploadSchema = z.object({
  subjectId: z.string().min(1),
  topicKind: z.enum(["theory", "practice"]),
});

export interface UploadResult {
  ok: true;
  record: ResourceRecord;
}

export interface UploadError {
  ok: false;
  reason: "size" | "type" | "empty" | "invalid" | "unauthorized" | "storage" | "db";
  message: string;
}

type DbResourceKind = (typeof resourceKindEnum.enumValues)[number];

function dbKindFor(kind: ResourceKind): DbResourceKind {
  // resources.kind enum: pdf | image | text_note | audio | url
  // Our UI narrows to pdf | image | text | markdown — collapse the last two.
  if (kind === "pdf") return "pdf";
  if (kind === "image") return "image";
  return "text_note";
}

function sanitizeFilename(name: string): string {
  // Keep extension, replace anything unsafe in the stem with `_`.
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const safeStem = stem
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 80);
  return `${safeStem || "file"}${ext}`;
}

/**
 * Uploads a material to Supabase Storage (`materials` bucket), inserts
 * `resources` + `documents` rows, and triggers the Inngest ingestion
 * pipeline for PDFs. Returns a `ResourceRecord` the client can render
 * immediately.
 *
 * Storage layout: `{userId}/{subjectId}/{resourceId}/{filename}` — the
 * first segment matches `auth.uid()` so the RLS policy on `storage.objects`
 * authorises user-scoped access.
 */
export async function uploadResource(
  formData: FormData,
): Promise<UploadResult | UploadError> {
  // ── 1. Session ───────────────────────────────────────────────────────────
  const session = await getSessionUser();
  if (!session) {
    return { ok: false, reason: "unauthorized", message: "Inicia sesión para subir recursos." };
  }
  const userId = session.user.id;

  // ── 2. Input validation ──────────────────────────────────────────────────
  const parsed = uploadSchema.safeParse({
    subjectId: formData.get("subjectId"),
    topicKind: formData.get("topicKind"),
  });
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "Datos de subida inválidos." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, reason: "empty", message: "Falta el archivo." };
  }
  if (file.size > MAX_RESOURCE_BYTES) {
    return {
      ok: false,
      reason: "size",
      message: `El archivo supera el máximo de ${(MAX_RESOURCE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
    };
  }

  const kind = kindForMime(file.type, file.name);
  if (!kind) {
    return {
      ok: false,
      reason: "type",
      message: "Tipo no permitido. Usa PDF, imagen, TXT o Markdown.",
    };
  }

  const allMimes: readonly string[] = Object.values(ACCEPTED_MIME_TYPES).flat();
  const effectiveMime = file.type || inferMimeFromName(file.name);
  if (file.type && !allMimes.includes(file.type.toLowerCase())) {
    const isExtOnly = /\.(md|markdown|txt)$/i.test(file.name);
    if (!isExtOnly) {
      return { ok: false, reason: "type", message: `MIME no permitido: ${file.type}.` };
    }
  }

  // ── 3. Upload to Storage (service role → bypasses RLS) ───────────────────
  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      reason: "storage",
      message: "Storage no configurado (falta SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const resourceId = crypto.randomUUID();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `${userId}/${parsed.data.subjectId}/${resourceId}/${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const admin = getServiceRoleSupabase();
  const { error: uploadError } = await admin.storage
    .from("materials")
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: effectiveMime,
      upsert: false,
    });

  if (uploadError) {
    console.error("[materials.upload] storage upload failed:", uploadError.message);
    return { ok: false, reason: "storage", message: "No se pudo guardar el archivo." };
  }

  // ── 4. Insert DB rows ────────────────────────────────────────────────────
  try {
    const [insertedResource] = await db
      .insert(resources)
      .values({
        id: resourceId,
        subjectId: parsed.data.subjectId,
        topicId: null,
        ownerUserId: userId,
        kind: dbKindFor(kind),
        title: file.name,
        source: "user_upload",
        storagePath,
        mimeType: effectiveMime,
        bytes: file.size,
        scope: "personal",
      })
      .returning({ id: resources.id, createdAt: resources.createdAt });

    if (!insertedResource) {
      throw new Error("resources insert returned no row");
    }

    // Only PDFs go through the document ingestion pipeline for now.
    let documentId: string | null = null;
    if (kind === "pdf") {
      const [insertedDoc] = await db
        .insert(documents)
        .values({ resourceId: insertedResource.id, status: "pending" })
        .returning({ id: documents.id });
      documentId = insertedDoc?.id ?? null;
    }

    // ── 5. Fire ingestion event (fire-and-forget; failures are non-fatal) ──
    if (documentId && process.env.INNGEST_EVENT_KEY) {
      try {
        await inngest.send({
          name: "document.uploaded",
          data: { documentId, resourceId: insertedResource.id, userId },
        });
      } catch (err) {
        console.warn("[materials.upload] inngest.send failed:", err);
      }
    }

    const record: ResourceRecord = {
      id: insertedResource.id,
      subjectId: parsed.data.subjectId,
      topicKind: parsed.data.topicKind,
      name: file.name,
      sizeBytes: file.size,
      mimeType: effectiveMime,
      kind,
      uploadedAtISO: insertedResource.createdAt.toISOString(),
    };
    return { ok: true, record };
  } catch (err) {
    // Roll back the uploaded file so the storage doesn't drift from the DB.
    await admin.storage
      .from("materials")
      .remove([storagePath])
      .catch((removeErr) => {
        console.warn("[materials.upload] storage rollback failed:", removeErr);
      });
    console.error("[materials.upload] db insert failed:", err);
    return { ok: false, reason: "db", message: "No se pudo registrar el recurso." };
  }
}

/**
 * Soft-deletes a resource and deletes the underlying object from Storage.
 */
export async function deleteResource(
  resourceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado." };
  if (!resourceId) return { ok: false, message: "resourceId requerido." };

  const row = await db.query.resources.findFirst({
    where: and(eq(resources.id, resourceId), eq(resources.ownerUserId, session.user.id)),
  });
  if (!row) return { ok: false, message: "Recurso no encontrado." };

  if (hasServiceRoleKey() && row.storagePath) {
    await getServiceRoleSupabase()
      .storage.from("materials")
      .remove([row.storagePath])
      .catch((e: unknown) => console.warn("[materials.delete] storage remove:", e));
  }

  await db
    .update(resources)
    .set({ deletedAt: new Date() })
    .where(eq(resources.id, resourceId));

  return { ok: true };
}

// ─── Listing + signed URLs ────────────────────────────────────────────────────

export type ResourceListItem = ResourceRecord;

/**
 * Lists the caller's resources for a subject. Returns an empty array if
 * the user is not signed in.
 */
export async function listResourcesForSubject(
  subjectId: string,
): Promise<ResourceListItem[]> {
  const session = await getSessionUser();
  if (!session) return [];

  const rows = await db
    .select({
      id: resources.id,
      subjectId: resources.subjectId,
      kind: resources.kind,
      title: resources.title,
      bytes: resources.bytes,
      mimeType: resources.mimeType,
      createdAt: resources.createdAt,
      storagePath: resources.storagePath,
    })
    .from(resources)
    .where(
      and(
        eq(resources.subjectId, subjectId),
        eq(resources.ownerUserId, session.user.id),
        isNull(resources.deletedAt),
      ),
    )
    .orderBy(desc(resources.createdAt));

  if (rows.length === 0) return [];

  // Pull document statuses for these resources in one query.
  const docs = await db
    .select({ resourceId: documents.resourceId, status: documents.status })
    .from(documents)
    .where(
      inArray(
        documents.resourceId,
        rows.map((r) => r.id),
      ),
    );
  const statusByResource = new Map(docs.map((d) => [d.resourceId, d.status]));

  return rows.map((r) => {
    const uiKind = uiKindFor(r.kind, r.mimeType ?? "", r.title);
    return {
      id: r.id,
      subjectId: r.subjectId,
      // topicKind here is UI-only metadata; resources don't carry it in DB.
      // Default to "theory"; components can override when they know better.
      topicKind: "theory" satisfies TopicKind,
      name: r.title,
      sizeBytes: r.bytes ?? 0,
      mimeType: r.mimeType ?? "application/octet-stream",
      kind: uiKind,
      uploadedAtISO: r.createdAt.toISOString(),
      documentStatus: statusByResource.get(r.id) ?? null,
    };
  });
}

/**
 * Creates a short-lived signed URL (1h) for a resource the caller owns.
 */
export async function getResourceSignedUrl(
  resourceId: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, message: "No autenticado." };

  const row = await db.query.resources.findFirst({
    where: and(
      eq(resources.id, resourceId),
      eq(resources.ownerUserId, session.user.id),
      isNull(resources.deletedAt),
    ),
  });
  if (!row?.storagePath) {
    return { ok: false, message: "Recurso no encontrado." };
  }

  if (!hasServiceRoleKey()) {
    return { ok: false, message: "Storage no configurado." };
  }

  const { data, error } = await getServiceRoleSupabase()
    .storage.from("materials")
    .createSignedUrl(row.storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "No se pudo firmar la URL." };
  }
  return { ok: true, url: data.signedUrl };
}

function inferMimeFromName(name: string): string {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.(jpe?g)$/i.test(name)) return "image/jpeg";
  if (/\.(md|markdown)$/i.test(name)) return "text/markdown";
  if (/\.txt$/i.test(name)) return "text/plain";
  return "application/octet-stream";
}

function uiKindFor(dbKind: DbResourceKind, mime: string, name: string): ResourceKind {
  if (dbKind === "pdf") return "pdf";
  if (dbKind === "image") return "image";
  // text_note / audio / url → map by mime/name where possible.
  if (mime === "text/markdown" || /\.(md|markdown)$/i.test(name)) return "markdown";
  return "text";
}
