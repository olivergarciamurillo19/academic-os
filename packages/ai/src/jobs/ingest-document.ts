/**
 * Plain async handler for the "ingest document" job.
 * Designed to be called from an Inngest function defined in the web app,
 * avoiding circular dependencies.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrizzleDb } from "../ingestion/pipeline.js";
import { documents, resources } from "@academic-os/db";
import { eq } from "drizzle-orm";
import { runIngestionPipeline } from "../ingestion/pipeline.js";

const MAX_ATTEMPTS = 3;

export type IngestDocumentParams = {
  documentId: string;
  attempt?: number;
  db: DrizzleDb;
  supabaseServiceClient: SupabaseClient;
};

export type IngestDocumentResult =
  | { success: true; chunksInserted: number }
  | { success: false; error: string };

export async function ingestDocumentHandler(
  params: IngestDocumentParams,
): Promise<IngestDocumentResult> {
  const { documentId, attempt = 1, db: drizzle, supabaseServiceClient } = params;

  // ── Guard: max retries exceeded ──────────────────────────────────────────
  if (attempt > MAX_ATTEMPTS) {
    const errorMsg = `Exceeded max retry attempts (${MAX_ATTEMPTS})`;
    await drizzle
      .update(documents)
      .set({
        status: "failed",
        processingError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { success: false, error: errorMsg };
  }

  // ── Fetch document record ────────────────────────────────────────────────
  const doc = await drizzle.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: { resource: true },
  });

  if (!doc) {
    const errorMsg = `Document not found: ${documentId}`;
    return { success: false, error: errorMsg };
  }

  const resource = doc.resource;

  if (!resource) {
    const errorMsg = `Resource not found for document ${documentId}`;
    await drizzle
      .update(documents)
      .set({
        status: "failed",
        processingError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    return { success: false, error: errorMsg };
  }

  if (!resource.storagePath) {
    const errorMsg = `Resource ${resource.id} has no storagePath`;
    await drizzle
      .update(documents)
      .set({
        status: "failed",
        processingError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    return { success: false, error: errorMsg };
  }

  // ── Mark as processing ───────────────────────────────────────────────────
  await drizzle
    .update(documents)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(documents.id, documentId));

  // ── Run pipeline ─────────────────────────────────────────────────────────
  try {
    const result = await runIngestionPipeline({
      resourceId: resource.id,
      storagePath: resource.storagePath,
      subjectId: resource.subjectId,
      topicId: resource.topicId ?? undefined,
      db: drizzle,
      supabaseServiceClient,
    });

    return { success: true, chunksInserted: result.chunksInserted };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : `Unknown error: ${String(err)}`;

    console.error(
      `[ingestDocumentHandler] attempt=${attempt} documentId=${documentId} error=${errorMsg}`,
    );

    await drizzle
      .update(documents)
      .set({
        status: "failed",
        processingError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { success: false, error: errorMsg };
  }
}
