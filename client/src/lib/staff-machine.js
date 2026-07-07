/** ตู้หยอดซองการ์ดสตาฟ — เวอร์ชันออนไลน์ (server-authoritative, ดู server/src/services/staffMachineService.js)
 * หยอดฟรีวันละ N ครั้ง เกินโควต้าใช้ "เหรียญตู้" ที่หาได้จาก Battle Pass + จบฤดูกาลอันดับดี */
import { onlineApi } from "./online-api.js";
import { ensureOnlineSession } from "./online-session.js";

export async function pullOnlineStaffMachine() {
  await ensureOnlineSession();
  return onlineApi("/api/clubs/me/staff-machine/pull", { method: "POST" });
}
