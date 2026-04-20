/**
 * File upload validation: checks magic bytes and size. Callers must still
 * enforce per-user quotas against the DB.
 */

export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const USER_TOTAL_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF (followed by "WEBP" at offset 8)
  gif: [0x47, 0x49, 0x46, 0x38],
} as const;

export type AllowedKind = "pdf" | "png" | "jpeg" | "webp" | "gif";

function matches(bytes: Uint8Array, magic: readonly number[], offset = 0): boolean {
  if (bytes.length < magic.length + offset) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i + offset] !== magic[i]) return false;
  }
  return true;
}

export function detectKind(bytes: Uint8Array): AllowedKind | null {
  if (matches(bytes, MAGIC.pdf)) return "pdf";
  if (matches(bytes, MAGIC.png)) return "png";
  if (matches(bytes, MAGIC.jpeg)) return "jpeg";
  if (matches(bytes, MAGIC.gif)) return "gif";
  if (
    matches(bytes, MAGIC.webp) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export interface GuardResult {
  ok: boolean;
  kind?: AllowedKind;
  reason?: string;
}

export function guardUpload(
  bytes: Uint8Array,
  opts: { allow?: readonly AllowedKind[]; maxBytes?: number } = {},
): GuardResult {
  const maxBytes = opts.maxBytes ?? UPLOAD_MAX_BYTES;
  if (bytes.length === 0) return { ok: false, reason: "empty_file" };
  if (bytes.length > maxBytes) return { ok: false, reason: "file_too_large" };

  const kind = detectKind(bytes);
  if (!kind) return { ok: false, reason: "unrecognized_content" };

  if (opts.allow && !opts.allow.includes(kind)) {
    return { ok: false, kind, reason: "disallowed_kind" };
  }
  return { ok: true, kind };
}
