/**
 * End-to-end ingestion pipeline:
 *   download → parse → chunk → embed → upsert document → insert chunks
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { db } from "@academic-os/db";
import {
  documents,
  chunks,
  resources,
} from "@academic-os/db";
import { eq } from "drizzle-orm";
import { parsePdf } from "./parse.js";
import { chunkText } from "./chunk.js";
import { embedBatch } from "./embed.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrizzleDb = typeof db;

export type PipelineParams = {
  resourceId: string;
  storagePath: string;
  subjectId: string;
  topicId?: string;
  db: DrizzleDb;
  supabaseServiceClient: SupabaseClient;
};

export type PipelineResult = {
  documentId: string;
  chunksInserted: number;
};

// ─── Pipeline ────────────────────────────────────────────────────────────────

export async function runIngestionPipeline(
  params: PipelineParams,
): Promise<PipelineResult> {
  const {
    resourceId,
    storagePath,
    subjectId,
    topicId,
    db: drizzle,
    supabaseServiceClient,
  } = params;

  // ── a. Upsert document record with status = processing ───────────────────
  const existingDoc = await drizzle.query.documents.findFirst({
    where: eq(documents.resourceId, resourceId),
  });

  let documentId: string;

  if (existingDoc) {
    documentId = existingDoc.id;
    await drizzle
      .update(documents)
      .set({ status: "processing", processingError: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  } else {
    const [inserted] = await drizzle
      .insert(documents)
      .values({
        resourceId,
        status: "processing",
      })
      .returning({ id: documents.id });

    if (!inserted) {
      throw new Error(
        `runIngestionPipeline: failed to create document record for resource ${resourceId}`,
      );
    }
    documentId = inserted.id;
  }

  // ── b. Download file from Supabase Storage ───────────────────────────────
  const { data: downloadData, error: downloadError } =
    await supabaseServiceClient.storage
      .from("resources")
      .download(storagePath);

  if (downloadError || !downloadData) {
    const msg = downloadError?.message ?? "empty response";
    throw new Error(
      `runIngestionPipeline: storage download failed for ${storagePath} — ${msg}`,
    );
  }

  // ── c. Convert Blob → Buffer ─────────────────────────────────────────────
  const arrayBuffer = await downloadData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // ── d. Parse PDF → text ──────────────────────────────────────────────────
  const text = await parsePdf(buffer);

  // ── e. Chunk text ────────────────────────────────────────────────────────
  const chunkList = chunkText(text);

  if (chunkList.length === 0) {
    throw new Error(
      `runIngestionPipeline: chunkText produced 0 chunks for resource ${resourceId}`,
    );
  }

  // ── f. Embed chunks ──────────────────────────────────────────────────────
  const embeddings = await embedBatch(chunkList.map((c) => c.content));

  if (embeddings.length !== chunkList.length) {
    throw new Error(
      `runIngestionPipeline: embedding count mismatch — ` +
        `expected ${chunkList.length}, got ${embeddings.length}`,
    );
  }

  // ── g. Insert all chunks in one statement ────────────────────────────────
  const chunkRows = chunkList.map((chunk, i) => ({
    // chunks.documentId references resources.id per schema
    documentId: resourceId,
    subjectId,
    topicId: topicId ?? null,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    embedding: embeddings[i] as number[],
    tokenCount: chunk.tokenCount,
    pageFrom: chunk.pageFrom ?? null,
    pageTo: chunk.pageTo ?? null,
  }));

  await drizzle.insert(chunks).values(chunkRows);

  // ── h. Mark document as indexed ──────────────────────────────────────────
  await drizzle
    .update(documents)
    .set({
      status: "indexed",
      textExtracted: true,
      indexedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return { documentId, chunksInserted: chunkList.length };
}
