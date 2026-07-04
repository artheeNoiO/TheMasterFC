import {
  getKv,
  json,
  loadUserById,
  parseBearerToken,
  toPublicUser,
} from "../../lib/auth-cf.js";

export async function onRequestGet(context) {
  const kv = getKv(context.env);
  if (!kv) {
    return json({ error: "ระบบ auth ยังไม่พร้อม (ไม่มี KV binding)" }, 503);
  }

  const userId = parseBearerToken(context.request);
  if (!userId) return json({ error: "ต้องล็อกอินก่อน" }, 401);

  const row = await loadUserById(kv, userId);
  if (!row) return json({ error: "ไม่พบผู้ใช้" }, 401);

  return json({
    user: toPublicUser(row),
    unlock: {
      onlineUnlocked: Boolean(row.onlineUnlocked),
      playMode: row.playMode || "sandbox",
      requiredTeamValue: 50_000_000,
    },
  });
}
