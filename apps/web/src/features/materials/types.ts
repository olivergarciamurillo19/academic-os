export type ResourceKind = "pdf" | "image" | "text" | "markdown";
export type TopicKind = "theory" | "practice";

export interface ResourceRecord {
  id: string;
  subjectId: string;
  topicKind: TopicKind;
  name: string;
  sizeBytes: number;
  mimeType: string;
  kind: ResourceKind;
  uploadedAtISO: string;
  /** Only exists for mock client-side uploads; real storage will expose a signed URL. */
  clientBlobUrl?: string;
}

export const ACCEPTED_MIME_TYPES: Readonly<Record<ResourceKind, readonly string[]>> = {
  pdf: ["application/pdf"],
  image: ["image/png", "image/jpeg", "image/heic", "image/heif", "image/webp"],
  text: ["text/plain"],
  markdown: ["text/markdown", "text/x-markdown"],
};

export const MAX_RESOURCE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ACCEPT_ATTRIBUTE =
  "application/pdf,image/png,image/jpeg,image/heic,image/heif,image/webp,text/plain,text/markdown,.md,.markdown";

export function kindForMime(mime: string, filename: string): ResourceKind | null {
  const lowerMime = mime.toLowerCase();
  if (ACCEPTED_MIME_TYPES.pdf.includes(lowerMime)) return "pdf";
  if (ACCEPTED_MIME_TYPES.image.includes(lowerMime)) return "image";
  if (ACCEPTED_MIME_TYPES.markdown.includes(lowerMime)) return "markdown";
  if (ACCEPTED_MIME_TYPES.text.includes(lowerMime)) {
    if (/\.(md|markdown)$/i.test(filename)) return "markdown";
    return "text";
  }
  if (/\.(md|markdown)$/i.test(filename)) return "markdown";
  if (/\.txt$/i.test(filename)) return "text";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
