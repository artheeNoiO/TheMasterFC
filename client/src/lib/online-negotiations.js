/** เสนอซื้อนักเตะตรงจากทีมอื่น (สไตล์ Top Eleven) — เรียก /api/negotiations/* + /api/leagues/:shardId/roster */
import { onlineApi } from "./online-api.js";
import { ensureOnlineSession } from "./online-session.js";

/** สโมสรของฉันบนชาร์ดจริง (ต้องเคยกด "เข้าสู่โลกออนไลน์" มาก่อนถึงจะมี) — คืน null ถ้ายังไม่มี */
export async function fetchMyShardClub() {
  await ensureOnlineSession();
  const data = await onlineApi("/api/clubs/me");
  return data.club || null;
}

/** รายชื่อนักเตะทุกทีมในชาร์ดเดียวกัน (ยกเว้นทีมตัวเอง) */
export async function fetchShardRoster(shardId) {
  await ensureOnlineSession();
  const data = await onlineApi(`/api/leagues/${shardId}/roster`);
  return data.clubs || [];
}

/** ข้อเสนอทั้งหมดที่เกี่ยวกับทีมฉัน — { sent: [...], received: [...] } */
export async function fetchMyOffers() {
  await ensureOnlineSession();
  return onlineApi("/api/negotiations");
}

/** เสนอซื้อนักเตะทีมอื่นตรงๆ */
export async function sendPlayerOffer({ playerId, feeOffer, wageOffer }) {
  await ensureOnlineSession();
  return onlineApi("/api/negotiations", {
    method: "POST",
    body: JSON.stringify({ playerId, feeOffer, wageOffer }),
  });
}

/** ตอบรับข้อเสนอที่มีคนส่งมา */
export async function acceptOffer(offerId) {
  await ensureOnlineSession();
  return onlineApi(`/api/negotiations/${offerId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action: "accept" }),
  });
}

/** ปฏิเสธข้อเสนอที่มีคนส่งมา */
export async function rejectOffer(offerId) {
  await ensureOnlineSession();
  return onlineApi(`/api/negotiations/${offerId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action: "reject" }),
  });
}

/** ต่อรองราคา/ค่าเหนื่อยข้อเสนอที่มีคนส่งมา */
export async function counterOffer(offerId, { counterFee, counterWage }) {
  await ensureOnlineSession();
  return onlineApi(`/api/negotiations/${offerId}/respond`, {
    method: "POST",
    body: JSON.stringify({ action: "counter", counterFee, counterWage }),
  });
}

/** ยกเลิกข้อเสนอที่ทีมฉันส่งไปเอง (ยังไม่มีใครตอบ) */
export async function cancelMyOffer(offerId) {
  await ensureOnlineSession();
  return onlineApi(`/api/negotiations/${offerId}/cancel`, { method: "POST" });
}
