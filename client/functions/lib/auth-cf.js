/** Shared auth helpers for Cloudflare Pages Functions (Web Crypto PBKDF2 + HMAC). */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const MIN_PASSWORD = 6;
const PBKDF2_ITERATIONS = 100_000;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 วัน — เท่ากับฝั่ง server/src/lib/auth-token.js

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function normalizeUsername(raw) {
  return String(raw ?? "").trim().toLowerCase();
}

export function validateUsername(username) {
  if (!USERNAME_RE.test(username)) {
    return "ชื่อผู้ใช้ 3–16 ตัว ใช้ได้เฉพาะ a-z, 0-9 และ _";
  }
  return null;
}

export function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD) {
    return `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัว`;
  }
  return null;
}

function b64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `pbkdf2:${b64(salt)}:${b64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  if (!stored?.startsWith("pbkdf2:")) return false;
  const [, saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = fromB64(saltB64);
  const expected = fromB64(hashB64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function getKv(env) {
  return env.ONLINE_KV || env.AUTH_KV || null;
}

export async function loadUserById(kv, userId) {
  const raw = await kv.get(`auth:user:${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadUserByUsername(kv, username) {
  const userId = await kv.get(`auth:name:${username}`);
  if (!userId) return null;
  return loadUserById(kv, userId);
}

export async function saveUser(kv, user) {
  await kv.put(`auth:user:${user.id}`, JSON.stringify(user));
  if (user.username) await kv.put(`auth:name:${user.username}`, user.id);
}

function toBase64Url(bytes) {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function importHmacKey(env) {
  const secret = env.AUTH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("AUTH_TOKEN_SECRET ยังไม่ได้ตั้งค่าใน Cloudflare Pages (Settings → Environment variables)");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** ออก token เซ็นด้วย HMAC-SHA256 (รูปแบบเดียวกับ server/src/lib/auth-token.js — ใช้ secret
 * เดียวกัน (AUTH_TOKEN_SECRET) แล้ว token จากที่นี่จะใช้กับ Render/home-server API ได้ตรงๆ ด้วย)
 * แทนที่ token เดิม `game:<userId>` ที่ไม่ได้เซ็นอะไรเลย ใครก็ปลอมได้ */
export async function signAuthTokenCf(env, userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { userId, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(env);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(new Uint8Array(sig))}`;
}

async function verifyAuthTokenCf(env, token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await importHmacKey(env);
    const sig = fromBase64Url(sigB64);
    const ok = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(payloadB64));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (!payload?.userId || typeof payload.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

/** คืน userId ถ้า token เซ็นถูกต้องและยังไม่หมดอายุ, มิฉะนั้น null — ต้อง await (เดิมเคยเป็น sync
 * ที่แค่ตัดคำว่า "game:" ออกแล้วเชื่อส่วนที่เหลือทันที ปลอม token ได้ทุกคน) */
export async function parseBearerToken(request, env) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  return verifyAuthTokenCf(env, token);
}
