/** Battle Pass รายเดือน — XP จากผลแมทลีค+login รายวัน (ดู server/src/services/battlePassService.js) */
import { onlineApi } from "./online-api.js";
import { ensureOnlineSession } from "./online-session.js";

export async function fetchBattlePassStatus() {
  await ensureOnlineSession();
  return onlineApi("/api/battlepass/me");
}

export async function claimBattlePassTier(tier) {
  await ensureOnlineSession();
  return onlineApi("/api/battlepass/claim", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}
