import { db } from "@academic-os/db";
import { ingestDocumentHandler } from "@academic-os/ai";
import { z } from "zod";

import { inngest } from "../lib/inngest.js";
import { getServiceRoleSupabase } from "../lib/supabase-admin.js";

const eventDataSchema = z.object({
  documentId: z.string().uuid(),
  resourceId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  attempt: z.number().int().min(1).optional(),
});

/**
 * Triggered by `document.uploaded`.
 *
 * Downloads the PDF from Supabase Storage, parses/chunks/embeds it and
 * upserts rows in `chunks`. On success emits `document.indexed` so other
 * jobs (e.g. reindexers, analytics) can react without polling.
 *
 * Retries are handled by Inngest's built-in retry policy (3 attempts by
 * default, exponential backoff). We also cap total attempts inside the
 * handler via the `attempt` event field.
 */
export const ingestDocument = inngest.createFunction(
  {
    id: "ingest-document",
    name: "Ingest uploaded document (parse → chunk → embed)",
    retries: 3,
  },
  { event: "document.uploaded" },
  async ({ event, step, attempt }) => {
    const parsed = eventDataSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new Error(
        `ingest-document: invalid event data — ${parsed.error.message}`,
      );
    }

    const { documentId } = parsed.data;

    const result = await step.run("run-pipeline", () =>
      ingestDocumentHandler({
        documentId,
        attempt: attempt + 1,
        db,
        supabaseServiceClient: getServiceRoleSupabase(),
      }),
    );

    if (result.success) {
      await step.sendEvent("emit-indexed", {
        name: "document.indexed",
        data: { documentId, chunksInserted: result.chunksInserted },
      });
      return { documentId, chunksInserted: result.chunksInserted };
    }

    // Let Inngest retry on failure.
    throw new Error(`ingest-document: ${result.error}`);
  },
);
