import {
  getKv,
  json,
  loadUserByUsername,
  normalizeUsername,
  signAuthTokenCf,
  toPublicUser,
  verifyPassword,
} from "../../lib/auth-cf.js";

export async function onRequestPost(context) {
  const kv = getKv(context.env);
  if (!kv) {
    return json({ error: "ระบบ auth ยังไม่พร้อม (ไม่มี KV binding)" }, 503);
  }

  try {
    const body = await context.request.json().catch(() => ({}));
    const username = normalizeUsername(body.username);
    const password = body.password ?? "";
    if (!username || !password) {
      return json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" }, 400);
    }

    const row = await loadUserByUsername(kv, username);
    if (!row?.passwordHash) {
      return json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
    }
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) return json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);

    const token = await signAuthTokenCf(context.env, row.id);
    return json({ user: toPublicUser(row), token });
  } catch (e) {
    console.error("auth/login", e);
    return json({ error: e.message || "เข้าสู่ระบบไม่สำเร็จ" }, 500);
  }
}
