import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed, expiring auth tokens — HMAC-SHA256, no external dependency.
 * Format: base64url(JSON payload) + "." + base64url(HMAC signature)
 * payload = { userId, iat, exp } (unix seconds)
 *
 * Replaces the old forgeable `game:<userId>` / `dev:<userId>` plaintext tokens.
 */

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    // Fail loudly in anything that looks like production — never silently
    // fall back to a weak/shared default for signing real user sessions.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_TOKEN_SECRET is not set. Refusing to start in production without a real signing secret."
      );
    }
    // Local/dev convenience only — never reachable in production because of the throw above.
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  return secret;
}

function base64urlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64urlDecode(input) {
  return Buffer.from(input, "base64url");
}

function sign(payloadB64) {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

/** ออก token ใหม่ให้ userId, มีอายุ TOKEN_TTL_SECONDS */
export function signAuthToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { userId, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * ตรวจสอบ token → คืน userId ถ้าถูกต้องและยังไม่หมดอายุ, มิฉะนั้นคืน null
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  let expectedSig;
  try {
    expectedSig = sign(payloadB64);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (!payload?.userId || typeof payload.exp !== "number") return null;
  const now = Math.floor(Date.now() / 1000);
  if (now >= payload.exp) return null;

  return payload.userId;
}
