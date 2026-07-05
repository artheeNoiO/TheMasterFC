/** แมทออนไลน์ตามเวลาจริง — เตะอัตโนมัติบนเซิร์ฟเวอร์ (ดู server/src/services/liveMatchService.js) ไคลเอนต์แค่ดู/สั่งเปลี่ยนตัวเท่านั้น */
import { onlineApi } from "./online-api.js";
import { ensureOnlineSession } from "./online-session.js";

/** แมททั้งหมดวันนี้ในชาร์ดเดียวกับฉัน (ของฉัน+คนอื่น) — ใช้เลือกว่าจะดูแมทไหน */
export async function fetchShardMatchesToday() {
  await ensureOnlineSession();
  return onlineApi("/api/matches/shard-today");
}

/** สถานะสดของแมทไหนก็ได้ในชาร์ดเดียวกับฉัน (โพลตามรอบเพื่ออัปเดต) */
export async function fetchLiveMatch(matchId) {
  await ensureOnlineSession();
  return onlineApi(`/api/matches/live/${matchId}`);
}

/** เปลี่ยนตัวระหว่างแมทสด — เฉพาะแมทของทีมตัวเอง */
export async function substitutePlayer(matchId, { outPlayerId, inPlayerId }) {
  await ensureOnlineSession();
  return onlineApi(`/api/matches/${matchId}/substitute`, {
    method: "POST",
    body: JSON.stringify({ outPlayerId, inPlayerId }),
  });
}

/** สั่งอารมณ์ทีมกลางแมทสด — attacking | balanced | defensive */
export async function setMatchMentality(matchId, mentality) {
  await ensureOnlineSession();
  return onlineApi(`/api/matches/${matchId}/mentality`, {
    method: "POST",
    body: JSON.stringify({ mentality }),
  });
}
