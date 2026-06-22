/**
 * SHA-256 hash of a string using the Web Crypto API (available in all Convex runtimes).
 * Returns a hex string. No Node.js required.
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Strips tracking parameters from long URLs.
 */
export function cleanUrl(url: string): string {
  if (url.length > 200 && url.includes("?")) {
    return url.split("?")[0];
  }
  return url;
}

/**
 * Get the current date and time in a human-readable format.
 */
export function getCurrentDateTime(): string {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZoneName: "short",
  });
}

