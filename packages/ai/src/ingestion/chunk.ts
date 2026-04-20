/**
 * Word-boundary text chunking with configurable target token size and overlap.
 * Token estimate: chars / 4 (OpenAI approximation).
 */

export type Chunk = {
  content: string;
  tokenCount: number;
  pageFrom?: number;
  pageTo?: number;
  chunkIndex: number;
};

type ChunkOptions = {
  targetTokens?: number;
  overlap?: number;
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const targetTokens = options?.targetTokens ?? 600;
  const overlap = options?.overlap ?? 50;

  // Target character counts derived from token estimates
  const targetChars = targetTokens * 4;
  const overlapChars = overlap * 4;

  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  let startWordIndex = 0;
  let chunkIndex = 0;

  while (startWordIndex < words.length) {
    // Build chunk up to targetChars
    let charCount = 0;
    let endWordIndex = startWordIndex;

    while (endWordIndex < words.length) {
      const word = words[endWordIndex];
      // +1 for the space between words
      const addition = (word?.length ?? 0) + (endWordIndex > startWordIndex ? 1 : 0);
      if (charCount + addition > targetChars && endWordIndex > startWordIndex) {
        break;
      }
      charCount += addition;
      endWordIndex++;
    }

    // Ensure we always advance at least one word to avoid infinite loop
    if (endWordIndex === startWordIndex) {
      endWordIndex = startWordIndex + 1;
    }

    const content = words.slice(startWordIndex, endWordIndex).join(" ");

    chunks.push({
      content,
      tokenCount: estimateTokens(content),
      chunkIndex,
    });

    chunkIndex++;

    // Calculate overlap: step back overlapChars worth of words from the end
    let overlapWordCount = 0;
    let overlapCharCount = 0;
    let backIndex = endWordIndex - 1;

    while (backIndex > startWordIndex && overlapCharCount < overlapChars) {
      const word = words[backIndex];
      overlapCharCount += (word?.length ?? 0) + 1;
      overlapWordCount++;
      backIndex--;
    }

    // Next chunk starts (endWordIndex - overlapWordCount) words back
    const nextStart = endWordIndex - overlapWordCount;
    // Ensure we always move forward
    startWordIndex = nextStart > startWordIndex ? nextStart : endWordIndex;
  }

  return chunks;
}
