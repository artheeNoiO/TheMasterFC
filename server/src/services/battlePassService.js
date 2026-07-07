import { prisma } from "../db.js";
import {
  BATTLE_PASS_TIERS, BP_XP_WIN, BP_XP_DRAW, BP_XP_LOSS, BP_XP_DAILY_LOGIN,
  currentSeasonMonth, currentGameDay,
} from "../../../game-version.js";

function tierForXp(xp) {
  let tier = 0;
  for (const row of BATTLE_PASS_TIERS) {
    if (xp >= row.xpRequired) tier = row.tier;
  }
  return tier;
}

async function getOrCreateProgress(userId) {
  const seasonMonth = currentSeasonMonth();
  const existing = await prisma.battlePassProgress.findUnique({
    where: { userId_seasonMonth: { userId, seasonMonth } },
  });
  if (existing) return existing;
  return prisma.battlePassProgress.create({ data: { userId, seasonMonth, xp: 0, claimedTiers: "[]" } });
}

export async function getBattlePassStatus(userId) {
  const progress = await getOrCreateProgress(userId);
  const claimed = JSON.parse(progress.claimedTiers || "[]");
  const tier = tierForXp(progress.xp);
  const next = BATTLE_PASS_TIERS.find((r) => r.xpRequired > progress.xp) || null;
  return {
    seasonMonth: progress.seasonMonth,
    xp: progress.xp,
    tier,
    claimedTiers: claimed,
    tiers: BATTLE_PASS_TIERS,
    nextTierXp: next ? next.xpRequired : null,
  };
}

async function addXp(userId, amount) {
  const progress = await getOrCreateProgress(userId);
  return prisma.battlePassProgress.update({
    where: { id: progress.id },
    data: { xp: progress.xp + amount },
  });
}

/** เรียกตอนจบแมทลีค — ให้ XP ตามผลแพ้ชนะเสมอ (เฉพาะ user จริง ไม่ใช่บอท) */
export async function awardMatchXp(userId, result) {
  if (!userId) return;
  const amount = result === "win" ? BP_XP_WIN : result === "draw" ? BP_XP_DRAW : BP_XP_LOSS;
  await addXp(userId, amount);
}

/** เรียกตอน login/เปิดเซสชัน — ให้ XP วันละครั้งเท่านั้น */
export async function awardDailyLoginXp(userId) {
  const progress = await getOrCreateProgress(userId);
  const today = currentGameDay();
  if (progress.lastLoginDay === today) return progress;
  return prisma.battlePassProgress.update({
    where: { id: progress.id },
    data: { xp: progress.xp + BP_XP_DAILY_LOGIN, lastLoginDay: today },
  });
}

/** รับรางวัล tier — reward.type==="coin" คือ "เหรียญตู้การ์ดสตาฟ" หยอดตู้ในโหมดออนไลน์ได้เลย
 * (เครดิตเข้า gameStateJson.staffDrawTickets ของสโมสรผู้เล่นโดยตรง) */
export async function claimBattlePassTier(userId, tierNumber) {
  const progress = await getOrCreateProgress(userId);
  const row = BATTLE_PASS_TIERS.find((r) => r.tier === tierNumber);
  if (!row) throw new Error("ไม่พบ tier นี้");
  if (progress.xp < row.xpRequired) throw new Error("XP ยังไม่ถึง tier นี้");
  const claimed = JSON.parse(progress.claimedTiers || "[]");
  if (claimed.includes(tierNumber)) throw new Error("รับรางวัล tier นี้ไปแล้ว");
  claimed.push(tierNumber);

  await prisma.battlePassProgress.update({
    where: { id: progress.id },
    data: { claimedTiers: JSON.stringify(claimed) },
  });

  if (row.reward.type === "coin") {
    const club = await prisma.club.findFirst({ where: { userId } });
    if (club) {
      const gs = JSON.parse(club.gameStateJson || "{}");
      gs.staffDrawTickets = (gs.staffDrawTickets || 0) + row.reward.amount;
      await prisma.club.update({ where: { id: club.id }, data: { gameStateJson: JSON.stringify(gs) } });
    }
  }
  return row.reward;
}

/** รีเซ็ตรายเดือน (ตามเวลาไทย) — ล้างตารางคะแนนทุกชาร์ด (ไม่แตะดิวิชั่น/สโมสร/นักเตะ)
 * Battle Pass ไม่ต้องรีเซ็ตมือ เพราะ key ด้วย seasonMonth อยู่แล้ว เดือนใหม่ = แถวใหม่โดยอัตโนมัติ */
export async function runMonthlyResetIfDue() {
  const nowMonth = currentSeasonMonth();
  let global = await prisma.gameGlobalState.findUnique({ where: { id: "singleton" } });
  if (!global) {
    global = await prisma.gameGlobalState.create({ data: { id: "singleton", lastMonthlyResetMonth: nowMonth } });
    return { ran: false, reason: "first_boot", month: nowMonth };
  }
  if (global.lastMonthlyResetMonth === nowMonth) return { ran: false, reason: "already_done", month: nowMonth };

  await prisma.standing.updateMany({
    data: { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 },
  });
  await prisma.gameGlobalState.update({
    where: { id: "singleton" },
    data: { lastMonthlyResetMonth: nowMonth },
  });
  return { ran: true, month: nowMonth };
}
