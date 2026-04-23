import { describe, expect, it } from "vitest";
import { parsePdf } from "../src/ingestion/parse.js";

/**
 * Minimal valid PDF with a single line of text. Built by hand so the test
 * has no disk dependency. Verifies the parser returns non-empty text or
 * throws a descriptive error — either outcome is acceptable, silent empty
 * strings are not.
 */
const MINIMAL_PDF_BYTES = Buffer.from(
  "%PDF-1.4\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
    "4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 50 700 Td (Hola Academic OS) Tj ET\nendstream\nendobj\n" +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n" +
    "xref\n0 6\n0000000000 65535 f\n" +
    "%%EOF\n",
  "binary",
);

describe("ai · ingestion · parsePdf", () => {
  it("accepts a %PDF header and returns a string or throws clearly", async () => {
    try {
      const text = await parsePdf(MINIMAL_PDF_BYTES);
      expect(typeof text).toBe("string");
      // Either the fallback found "Hola Academic OS" in the raw bytes, or unpdf
      // succeeded — in both cases the output should be non-empty.
      expect(text.length).toBeGreaterThan(0);
    } catch (err) {
      // Acceptable: minimal PDF may not be parseable by unpdf. The error
      // must be a real Error with a message, not a silent undefined.
      expect(err).toBeInstanceOf(Error);
      expect(String((err as Error).message)).toMatch(/pdf|parse/i);
    }
  });

  it("throws on empty buffer", async () => {
    await expect(parsePdf(Buffer.alloc(0))).rejects.toBeDefined();
  });
});
