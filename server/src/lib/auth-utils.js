import bcrypt from "bcryptjs";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;
const MIN_PASSWORD = 6;
const BCRYPT_ROUNDS = 10;

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

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/** ส่งให้ client — ไม่รวม passwordHash */
export function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
