/**
 * PDF parsing — tries unpdf first, falls back to raw buffer text extraction.
 * Throws a descriptive error if both strategies fail.
 */

export async function parsePdf(buffer: Buffer): Promise<string> {
  // Strategy 1: unpdf extractText
  try {
    const { extractText } = await import("unpdf");
    // unpdf accepts a Uint8Array / ArrayBuffer
    const uint8 = new Uint8Array(buffer);
    const { text } = await extractText(uint8, { mergePages: true });
    if (text && text.trim().length > 0) {
      return text;
    }
  } catch (unpdfError: unknown) {
    const message =
      unpdfError instanceof Error ? unpdfError.message : String(unpdfError);
    // Log but continue to fallback — don't throw yet
    console.warn(`[parse] unpdf extraction failed: ${message}`);
  }

  // Strategy 2: naive text extraction from raw buffer bytes.
  // Useful for simple/unencrypted PDFs where text streams are readable.
  try {
    const raw = buffer.toString("latin1");
    // Extract printable ASCII-range runs from the raw PDF byte stream.
    const matches = raw.match(/[\x20-\x7E]{4,}/g);
    if (matches && matches.length > 0) {
      const extracted = matches
        .filter((s) => /[a-zA-Z]{2,}/.test(s)) // must contain real words
        .join(" ")
        .trim();
      if (extracted.length > 0) {
        return extracted;
      }
    }
  } catch (fallbackError: unknown) {
    const message =
      fallbackError instanceof Error
        ? fallbackError.message
        : String(fallbackError);
    console.warn(`[parse] buffer fallback extraction failed: ${message}`);
  }

  throw new Error(
    "parsePdf: both unpdf and buffer-based extraction failed — " +
      "the file may be encrypted, corrupt, or contain only scanned images.",
  );
}
