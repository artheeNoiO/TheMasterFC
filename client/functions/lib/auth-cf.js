/** Shared auth helpers for Cloudflare Pages Functions (Web Crypto PBKDF2). */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const MIN_PASSWORD = 6;
const PBKDF2_ITERATIONS = 100_000;

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

export function parseBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (!token.startsWith("game:")) return null;
  return token.slice(5);
}
