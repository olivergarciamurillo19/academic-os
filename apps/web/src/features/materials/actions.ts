"use server";

import { z } from "zod";

import {
  ACCEPTED_MIME_TYPES,
  MAX_RESOURCE_BYTES,
  kindForMime,
  type ResourceRecord,
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
  reason: "size" | "type" | "empty" | "invalid";
  message: string;
}

/**
 * Mock resource upload server action.
 *
 * TODO(backend): once Armando lands Supabase Storage + resources table:
 *   - Stream the file to the `materials` bucket scoped by tenant+subject.
 *   - Insert a row in `public.resource` via Drizzle.
 *   - Emit `document.uploaded` Inngest event for ingestion/embedding.
 *
 * For now we only validate and mint an id. The client keeps the Blob
 * and its object URL so the viewer can render during the mock phase.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function uploadResource(formData: FormData): Promise<UploadResult | UploadError> {
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
      message: "Tipo de archivo no permitido. Usa PDF, imagen, TXT o Markdown.",
    };
  }

  const allMimes: readonly string[] = Object.values(ACCEPTED_MIME_TYPES).flat();
  if (file.type && !allMimes.includes(file.type.toLowerCase())) {
    const isExtOnly = /\.(md|markdown|txt)$/i.test(file.name);
    if (!isExtOnly) {
      return {
        ok: false,
        reason: "type",
        message: `MIME no permitido: ${file.type}.`,
      };
    }
  }

  const record: ResourceRecord = {
    id: cryptoRandomId(),
    subjectId: parsed.data.subjectId,
    topicKind: parsed.data.topicKind,
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type || inferMimeFromName(file.name),
    kind,
    uploadedAtISO: new Date().toISOString(),
  };

  return { ok: true, record };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function deleteResource(resourceId: string): Promise<{ ok: true }> {
  // TODO(backend): soft-delete row + revoke Storage signed URL.
  if (!resourceId) throw new Error("Missing resource id");
  return { ok: true };
}

function cryptoRandomId(): string {
  // Prefer Web Crypto; fall back for older runtimes.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `res_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function inferMimeFromName(name: string): string {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.(jpe?g)$/i.test(name)) return "image/jpeg";
  if (/\.(md|markdown)$/i.test(name)) return "text/markdown";
  if (/\.txt$/i.test(name)) return "text/plain";
  return "application/octet-stream";
}
