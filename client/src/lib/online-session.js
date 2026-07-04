import { getToken } from "./api.js";
import {
  clearOnlineToken,
  getGameApiBase,
  getOnlineToken,
  onlineApi,
  setOnlineToken,
} from "./online-api.js";
import { computeTeamValueFromCareer } from "./online-migrate.js";

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/** แลก game: token (CF) → JWT สำหรับ game API หรือใช้ JWT เดิมบน local dev */
export async function ensureOnlineSession() {
  const existing = getOnlineToken();
  if (existing) {
    try {
      await onlineApi("/api/auth/me");
      return existing;
    } catch {
      clearOnlineToken();
    }
  }

  if (isLocalHost()) {
    const gameToken = getToken();
    if (!gameToken) throw new Error("ต้องล็อกอิน Game ID ก่อน");
    setOnlineToken(gameToken);
    await onlineApi("/api/auth/me");
    return gameToken;
  }

  const gameToken = getToken();
  if (!gameToken?.startsWith("game:")) {
    throw new Error("ต้องล็อกอิน Game ID ก่อนเข้าโหมดออนไลน์");
  }

  const res = await fetch("/api/online/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gameToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const base = getGameApiBase();
    throw new Error(
      data.error
        || (base.includes("api.themasterfc")
          ? "เซิร์ฟเวอร์ออนไลน์ไม่พร้อม"
          : "ยังไม่ได้ตั้ง VITE_GAME_API_URL สำหรับ production"),
    );
  }
  setOnlineToken(data.token);
  return data.token;
}

/** ปลดล็อกออนไลน์ + สร้างสโมสรบน shard ถ้ายังไม่มี (จาก sandbox — legacy) */
export async function bootstrapOnlineFromCareer(career) {
  await ensureOnlineSession();

  const teamValue = computeTeamValueFromCareer(career);
  await onlineApi("/api/auth/unlock-online", {
    method: "POST",
    body: JSON.stringify({ teamValue }),
  });

  const me = await onlineApi("/api/clubs/me");
  if (me.club) return me;

  const team = career.teams?.find((t) => t.id === career.userTeamId);
  if (!team) throw new Error("ไม่พบสโมสรในเซฟโลกจำลอง");

  await onlineApi("/api/clubs", {
    method: "POST",
    body: JSON.stringify({
      name: team.name,
      short: team.short,
      primaryColor: team.color || team.primaryColor || "#c1440e",
      secondaryColor: team.secondaryColor || "#f2f0e6",
      shirtColor: team.shirtColor || team.color,
      shortsColor: team.shortsColor || "#0b2318",
      logoIndex: team.logoIndex ?? 0,
    }),
  });

  return onlineApi("/api/clubs/me");
}

/** Full Online — ข้าม sandbox: ล็อกอินแล้วเข้าเซิร์ฟเวอร์เลย */
export async function bootstrapOnlineDirect() {
  await ensureOnlineSession();
  try {
    await onlineApi("/api/auth/unlock-online", {
      method: "POST",
      body: JSON.stringify({ teamValue: 500_000_000 }),
    });
  } catch {
    /* ปลดล็อกแล้ว */
  }
  return onlineApi("/api/clubs/me");
}
