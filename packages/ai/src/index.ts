// ─── Ingestion pipeline ───────────────────────────────────────────────────────
export { parsePdf } from "./ingestion/parse.js";
export { chunkText } from "./ingestion/chunk.js";
export type { Chunk } from "./ingestion/chunk.js";
export { embedBatch } from "./ingestion/embed.js";
export {
  runIngestionPipeline,
} from "./ingestion/pipeline.js";
export type {
  DrizzleDb,
  PipelineParams,
  PipelineResult,
} from "./ingestion/pipeline.js";

// ─── Job handlers ─────────────────────────────────────────────────────────────
export { ingestDocumentHandler } from "./jobs/ingest-document.js";
export type {
  IngestDocumentParams,
  IngestDocumentResult,
} from "./jobs/ingest-document.js";
