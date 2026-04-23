/**
 * Hybrid retrieval for chat and test generation.
 *
 * Combines cosine similarity over HNSW-indexed pgvector embeddings with a
 * Spanish full-text rank (GIN index on to_tsvector('spanish', content)).
 * Both scores are normalised to [0,1] and fused with a 0.7/0.3 weight; the
 * top K rows are returned with enough metadata to build citations.
 */

import { embedBatch } from "@academic-os/ai";
import { client, db, resources } from "@academic-os/db";
import { eq, inArray } from "drizzle-orm";

export interface RetrievedChunk {
  chunkId: string;
  resourceId: string;
  resourceTitle: string | null;
  subjectId: string;
  content: string;
  pageFrom: number | null;
  pageTo: number | null;
  score: number;
}

const DEFAULT_TOP_K = 8;
const VECTOR_WEIGHT = 0.7;
const FTS_WEIGHT = 0.3;

/**
 * Runs hybrid vector + BM25-style search scoped to a subject. Optionally
 * further narrows by topic.
 *
 * Returns an empty array if the user query is empty or if embeddings are
 * unavailable (e.g. missing OPENAI_API_KEY in the runtime). Callers should
 * handle the empty case by falling back to a plain LLM answer.
 */
export async function retrieveChunks(params: {
  query: string;
  subjectId: string;
  topicId?: string;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const q = params.query.trim();
  if (q.length === 0) return [];

  if (!process.env.OPENAI_API_KEY) return [];

  // ── 1. Embed the query ───────────────────────────────────────────────────
  let queryEmbedding: number[];
  try {
    const [vec] = await embedBatch([q]);
    if (!vec) return [];
    queryEmbedding = vec;
  } catch (err) {
    console.error("[rag.retrieveChunks] embed failed:", err);
    return [];
  }

  const topK = params.topK ?? DEFAULT_TOP_K;
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  // ── 2. Hybrid SQL ────────────────────────────────────────────────────────
  // Use two CTEs so we can normalise and fuse the scores. Cosine distance
  // `<=>` from pgvector maps to similarity = 1 - distance. ts_rank is
  // normalised to [0,1] by dividing by the max rank in the candidate set.
  const topicClause = params.topicId ? `AND c.topic_id = $3` : "";
  const values: unknown[] = [params.subjectId, embeddingLiteral];
  if (params.topicId) values.push(params.topicId);
  values.push(topK);

  const sqlText = `
    WITH candidates AS (
      SELECT
        c.id,
        c.document_id,
        c.subject_id,
        c.content,
        c.page_from,
        c.page_to,
        (1 - (c.embedding <=> $2::vector)) AS cos_sim,
        ts_rank(to_tsvector('spanish', c.content), plainto_tsquery('spanish', $${params.topicId ? "4" : "3"})) AS fts_rank
      FROM chunks c
      WHERE c.subject_id = $1
        ${topicClause}
      ORDER BY c.embedding <=> $2::vector ASC
      LIMIT 40
    ),
    normalised AS (
      SELECT
        id, document_id, subject_id, content, page_from, page_to,
        cos_sim,
        CASE
          WHEN MAX(fts_rank) OVER () > 0 THEN fts_rank / MAX(fts_rank) OVER ()
          ELSE 0
        END AS fts_norm
      FROM candidates
    )
    SELECT id, document_id, subject_id, content, page_from, page_to,
      (${VECTOR_WEIGHT} * cos_sim + ${FTS_WEIGHT} * fts_norm) AS score
    FROM normalised
    ORDER BY score DESC
    LIMIT $${params.topicId ? "5" : "4"};
  `;

  // Put the query at the right placeholder index. We reuse $3/$4 as the
  // query text for ts_rank depending on whether topicId was supplied.
  const queryParams = params.topicId
    ? [params.subjectId, embeddingLiteral, params.topicId, q, topK]
    : [params.subjectId, embeddingLiteral, q, topK];

  interface Row {
    id: string;
    document_id: string;
    subject_id: string;
    content: string;
    page_from: number | null;
    page_to: number | null;
    score: string;
  }

  let rows: Row[];
  try {
    rows = (await client.unsafe(sqlText, queryParams as string[])) as unknown as Row[];
  } catch (err) {
    console.error("[rag.retrieveChunks] sql failed:", err);
    return [];
  }

  if (rows.length === 0) return [];

  // ── 3. Attach resource titles in one query ───────────────────────────────
  const resourceIds = [...new Set(rows.map((r) => r.document_id))];
  const resourceRows = await db
    .select({ id: resources.id, title: resources.title })
    .from(resources)
    .where(inArray(resources.id, resourceIds));
  const titleById = new Map(resourceRows.map((r) => [r.id, r.title]));

  void eq; // keep import for potential future filter usage

  return rows.map((r) => ({
    chunkId: r.id,
    resourceId: r.document_id,
    resourceTitle: titleById.get(r.document_id) ?? null,
    subjectId: r.subject_id,
    content: r.content,
    pageFrom: r.page_from,
    pageTo: r.page_to,
    score: Number(r.score),
  }));
}

/**
 * Builds a compact context block for the LLM system prompt. Citations are
 * rendered inline as `[1] [2] …` so the model can reference them and the
 * UI can click through.
 */
export function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  const blocks = chunks.map((c, i) => {
    const loc =
      c.pageFrom !== null
        ? c.pageTo !== null && c.pageTo !== c.pageFrom
          ? ` (p. ${String(c.pageFrom)}–${String(c.pageTo)})`
          : ` (p. ${String(c.pageFrom)})`
        : "";
    const title = c.resourceTitle ?? "Apunte";
    return `[${String(i + 1)}] ${title}${loc}:\n${c.content.trim()}`;
  });
  return blocks.join("\n\n---\n\n");
}
