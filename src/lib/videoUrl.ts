/**
 * Video URL obfuscation & proxy routing.
 * Maps third-party CDN domains to first-party proxy paths via Vercel rewrites.
 * Adds lightweight XOR obfuscation for in-memory storage.
 */

const CDN_MAP: Record<string, string> = {
  "cdn.cineveo.site": "/v/a",
  "watch.brstream.cc": "/v/b",
  "vods.playcnvs.com": "/v/c",
};

const XOR_KEY = 0x5A; // Simple XOR key for in-memory obfuscation

/**
 * Transform a raw CDN URL into a proxied first-party URL.
 * e.g. https://cdn.cineveo.site/video.mp4 → /v/a/video.mp4
 */
export function proxyVideoUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const proxyPrefix = CDN_MAP[url.hostname];
    if (proxyPrefix) {
      // Use origin-relative path so it goes through user's Vercel domain
      return `${proxyPrefix}${url.pathname}${url.search}`;
    }
  } catch {
    // Not a valid URL or no match - return as-is
  }
  return rawUrl;
}

/**
 * Lightweight XOR encode for storing URLs in memory (not in DOM/network).
 * NOT cryptographic - just prevents casual string searching.
 */
export function encodeUrl(url: string): string {
  return btoa(
    url
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY))
      .join("")
  );
}

export function decodeUrl(encoded: string): string {
  try {
    return atob(encoded)
      .split("")
      .map((c) => String.fromCharCode(c.charCodeAt(0) ^ XOR_KEY))
      .join("");
  } catch {
    return encoded;
  }
}

/**
 * Full pipeline: take raw CDN URL → proxy through domain → encode for storage.
 */
export function secureVideoUrl(rawUrl: string): string {
  return proxyVideoUrl(rawUrl);
}
