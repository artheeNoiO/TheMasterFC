import {
  getKv,
  hashPassword,
  json,
  normalizeUsername,
  saveUser,
  signAuthTokenCf,
  toPublicUser,
  validatePassword,
  validateUsername,
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
    const displayName = String(body.displayName ?? "").trim().slice(0, 32);

    const userErr = validateUsername(username);
    if (userErr) return json({ error: userErr }, 400);
    const passErr = validatePassword(password);
    if (passErr) return json({ error: passErr }, 400);

    const existing = await kv.get(`auth:name:${username}`);
    if (existing) return json({ error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" }, 409);

    const passwordHash = await hashPassword(password);
    const user = {
      id: `usr_${crypto.randomUUID()}`,
      username,
      email: null,
      authProvider: "local",
      displayName: displayName || username,
      playMode: "sandbox",
      onlineUnlocked: false,
      onlineUnlockedAt: null,
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    await saveUser(kv, user);

    const token = await signAuthTokenCf(context.env, user.id);
    return json({ user: toPublicUser(user), token }, 201);
  } catch (e) {
    console.error("auth/register", e);
    return json({ error: e.message || "สมัครสมาชิกไม่สำเร็จ" }, 500);
  }
}
