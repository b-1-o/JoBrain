import { describe, expect, it } from "vitest";
import {
  buildMediaObjectKey,
  detectImageMime,
  isSafePublicImageUrl,
  sanitizeImageUrl,
  validateMediaBytes,
} from "./media";

function pngHeader(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
}

function jpegHeader(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
}

describe("detectImageMime", () => {
  it("detects png and jpeg magic bytes", () => {
    expect(detectImageMime(pngHeader())).toBe("image/png");
    expect(detectImageMime(jpegHeader())).toBe("image/jpeg");
    expect(detectImageMime(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("validateMediaBytes", () => {
  it("accepts valid avatar png", () => {
    const result = validateMediaBytes("avatar", pngHeader(), "image/png");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mime).toBe("image/png");
  });

  it("rejects empty and oversized payloads", () => {
    expect(validateMediaBytes("avatar", new Uint8Array()).ok).toBe(false);
    const huge = new Uint8Array(3 * 1024 * 1024);
    huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateMediaBytes("avatar", huge).ok).toBe(false);
  });

  it("rejects non-image bytes even when client claims image/png", () => {
    const result = validateMediaBytes("banner", new Uint8Array([0, 1, 2, 3, 4, 5]), "image/png");
    expect(result.ok).toBe(false);
  });
});

describe("URL safety", () => {
  it("allows public https image urls", () => {
    expect(isSafePublicImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(sanitizeImageUrl("https://cdn.example.com/a.png")).toContain("https://");
  });

  it("blocks local and credentialed urls", () => {
    expect(isSafePublicImageUrl("http://localhost/x.png")).toBe(false);
    expect(isSafePublicImageUrl("https://127.0.0.1/x.png")).toBe(false);
    expect(isSafePublicImageUrl("https://user:pass@cdn.example.com/x.png")).toBe(false);
    expect(sanitizeImageUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("buildMediaObjectKey", () => {
  it("scopes keys under user and kind without path traversal", () => {
    const key = buildMediaObjectKey("../evil/user", "avatar", "image/png");
    expect(key.startsWith("jobrain/")).toBe(true);
    expect(key).toContain("avatar-");
    expect(key.endsWith(".png")).toBe(true);
    expect(key).not.toContain("..");
  });
});
