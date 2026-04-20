/**
 * Batch embedding via OpenAI text-embedding-3-small (1536 dimensions).
 * Groups requests in batches of 100 (OpenAI per-request limit).
 */

import OpenAI from "openai";

const BATCH_SIZE = 100;
const MODEL = "text-embedding-3-small";

function getOpenAiClient(): OpenAI {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "embedBatch: OPENAI_API_KEY environment variable is not set.",
    );
  }
  return new OpenAI({ apiKey });
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = getOpenAiClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batchTexts = texts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: MODEL,
      input: batchTexts,
      encoding_format: "float",
    });

    // Preserve original ordering — OpenAI returns embeddings in the same order
    const sorted = response.data
      .slice()
      .sort((a, b) => a.index - b.index);

    for (const item of sorted) {
      results.push(item.embedding);
    }
  }

  return results;
}
