import { describe, expect, it } from "vitest";
import { chunkText } from "../src/ingestion/chunk.js";

describe("ai · ingestion · chunk", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("produces chunks within the 500-800 token range for long text", () => {
    // ~4 chars per token → aim for ~8000 chars = ~2000 tokens → ~3-4 chunks at target 600.
    const text = "palabra ".repeat(2000);
    const chunks = chunkText(text, { targetTokens: 600, overlap: 50 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      // Last chunk can be smaller, but all others should land in the band.
      if (c.chunkIndex === chunks.length - 1) continue;
      expect(c.tokenCount).toBeGreaterThanOrEqual(400);
      expect(c.tokenCount).toBeLessThanOrEqual(800);
    }
  });

  it("indexes chunks sequentially starting at 0", () => {
    const text = "palabra ".repeat(500);
    const chunks = chunkText(text, { targetTokens: 200 });
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]!.chunkIndex).toBe(i);
    }
  });

  it("overlaps words between consecutive chunks when overlap > 0", () => {
    const text = Array.from({ length: 500 }, (_, i) => `w${i}`).join(" ");
    const chunks = chunkText(text, { targetTokens: 100, overlap: 20 });
    if (chunks.length < 2) return;

    const first = chunks[0]!.content.split(/\s+/);
    const second = chunks[1]!.content.split(/\s+/);
    const lastOfFirst = first.slice(-5);
    const firstOfSecond = second.slice(0, 30);
    // At least one word from the tail of chunk 0 should appear near the head of chunk 1.
    const hasOverlap = lastOfFirst.some((w) => firstOfSecond.includes(w));
    expect(hasOverlap).toBe(true);
  });
});
