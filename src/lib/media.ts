/**
 * Media validation for profile uploads (avatar, banner, background).
 * Never trusts client-provided MIME alone — always inspect magic bytes.
 */

export const MEDIA_KINDS = ["avatar", "banner", "background"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_LIMITS: Record<
  MediaKind,
  { maxBytes: number; allowed: ReadonlyArray<"image/png" | "image/jpeg" | "image/webp" | "image/gif"> }
> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    allowed: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  banner: {
    maxBytes: 5 * 1024 * 1024,
    allowed: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  background: {
    maxBytes: 6 * 1024 * 1024,
    allowed: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
};

const MAGIC: Array<{ mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; test: (bytes: Uint8Array) => boolean }> = [
  {
    mime: "image/png",
    test: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/jpeg",
    test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/gif",
    test: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x39 || b[4] === 0x37) &&
      b[5] === 0x61,
  },
  {
    mime: "image/webp",
    test: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

export function detectImageMime(bytes: Uint8Array): (typeof MAGIC)[number]["mime"] | null {
  for (const entry of MAGIC) {
    if (entry.test(bytes)) return entry.mime;
  }
  return null;
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export type MediaValidationResult =
  | { ok: true; mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; size: number }
  | { ok: false; error: string };

export function validateMediaBytes(
  kind: MediaKind,
  bytes: Uint8Array,
  claimedMime?: string | null,
): MediaValidationResult {
  const limits = MEDIA_LIMITS[kind];
  if (!bytes.length) return { ok: false, error: "Empty file." };
  if (bytes.length > limits.maxBytes) {
    return {
      ok: false,
      error: `File is too large. Max ${Math.round(limits.maxBytes / (1024 * 1024))}MB for ${kind}.`,
    };
  }

  const detected = detectImageMime(bytes);
  if (!detected) return { ok: false, error: "Unsupported image format. Use PNG, JPG, WebP, or GIF." };
  if (!limits.allowed.includes(detected)) {
    return { ok: false, error: `${detected} is not allowed for ${kind}.` };
  }

  if (claimedMime && claimedMime !== detected && claimedMime !== "application/octet-stream") {
    // Soft mismatch is fine if magic is valid; we still accept detected type.
  }

  return { ok: true, mime: detected, size: bytes.length };
}

/** Safe object key for user media — no path traversal. */
export function buildMediaObjectKey(userId: string, kind: MediaKind, mime: string): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "user";
  const ext = extensionForMime(mime);
  const stamp = Date.now().toString(36);
  return `jobrain/${safeUser}/${kind}-${stamp}.${ext}`;
}

export function isSafePublicImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return value.trim().length <= 2048;
  } catch {
    return false;
  }
}

export function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return isSafePublicImageUrl(value) ? value.trim().slice(0, 2048) : null;
}
