import {
  getKv,
  json,
  loadUserById,
  parseBearerToken,
  toPublicUser,
} from "../../lib/auth-cf.js";

/** แลก game: token → JWT จาก game API (Render) สำหรับ Phase 1 online */
export async function onRequestPost(context) {
  const kv = getKv(context.env);
  if (!kv) return json({ error: "ระบบ auth ยังไม่พร้อม (ไม่มี KV)" }, 503);

  const userId = await parseBearerToken(context.request, context.env);
  if (!userId) return json({ error: "ต้องล็อกอิน Game ID ก่อน" }, 401);

  const row = await loadUserById(kv, userId);
  if (!row) return json({ error: "ไม่พบผู้ใช้" }, 401);

  const apiBase = (context.env.GAME_API_URL || "https://api.themasterfc.com").replace(/\/$/, "");
  const secret = context.env.GAME_PROVISION_SECRET || "";
  if (!secret) {
    return json({
      error: "เซิร์ฟเวอร์ออนไลน์ยังไม่ได้ตั้งค่า GAME_PROVISION_SECRET บน Cloudflare Pages (รัน Setup-Online-Bridge.bat)",
    }, 503);
  }

  try {
    const res = await fetch(`${apiBase}/api/auth/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-provision-secret": secret,
      },
      body: JSON.stringify({
        id: row.id,
        username: row.username,
        displayName: row.displayName || row.username,
        onlineUnlocked: Boolean(row.onlineUnlocked),
        playMode: row.playMode || "sandbox",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "provision failed" }, res.status);
    }
    return json({
      user: toPublicUser(row),
      token: data.token,
      apiUser: data.user,
    });
  } catch (e) {
    console.error("online/session", e);
    return json({ error: "เชื่อมต่อเซิร์ฟเวอร์เกมไม่สำเร็จ" }, 502);
  }
}
