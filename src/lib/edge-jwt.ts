/**
 * Minimal HS256 JWT verification for the Edge middleware.
 * Kept dependency-free so middleware does not pull Node-only modules.
 */

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJson(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
  } catch {
    return null;
  }
}

export interface EdgeSessionPayload {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  role: string;
  studioId: string;
  studioName?: string;
  exp?: number;
}

export async function verifyEdgeSessionToken(
  token: string,
  secret: string
): Promise<EdgeSessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJson(headerPart);
  if (!header || header.alg !== "HS256") return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signatureBytes = base64UrlToBytes(signaturePart);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.buffer as ArrayBuffer,
    new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  );
  if (!valid) return null;

  const payload = decodeJson(payloadPart) as EdgeSessionPayload | null;
  if (!payload?.userId || !payload?.sessionId) return null;
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return null;

  return payload;
}
