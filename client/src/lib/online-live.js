/** ดูสกอร์สดของแมทอื่นในชาร์ดเดียวกัน — เรียก /api/leagues/:shardId/matches/live */
import { onlineApi } from "./online-api.js";
import { ensureOnlineSession } from "./online-session.js";

/** สกอร์สดของทุกแมทวันนี้ในชาร์ด (คำนวณจากเวลาจริงฝั่ง server) — คืน { day, matches: [...] } */
export async function fetchShardLiveMatches(shardId) {
  await ensureOnlineSession();
  return onlineApi(`/api/leagues/${shardId}/matches/live`);
}
