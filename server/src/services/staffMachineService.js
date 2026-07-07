/**
 * ตู้หยอดซองการ์ดสตาฟ — เวอร์ชันออนไลน์ (server-authoritative)
 * หยอดฟรีวันละ DAILY_STAFF_CARD_DRAWS ครั้ง เกินโควตาต้องใช้ "เหรียญตู้" (gs.staffDrawTickets)
 * ซึ่งหาได้จาก Battle Pass (battlePassService.js) + จบฤดูกาลอันดับดี (roadmapService.js)
 */
import { prisma } from "../db.js";
import { rand, choice, uid, FIRST_NAMES, LAST_NAMES } from "@siam/game-engine";
import { DAILY_STAFF_CARD_DRAWS } from "../../../game-version.js";

export const CARDS_PER_STAFF_PULL = 5;
const MANAGER_STAT_KEYS = ["development", "tactics", "manManagement", "negotiation", "scouting", "reputation"];
const COACH_SPECIALTIES = ["GK", "DF", "MF", "FW", "FITNESS"];

/** น้ำหนักดาว 1-5★ ต่อ tier — เหมือนฝั่ง Sandbox (Bronze ออกบ่อยสุด, Gold หายากสุดแต่จำกัดแค่ 5★) */
const MACHINE_TIERS = {
  bronze: { key: "bronze", label: "Bronze", machineWeight: 60, weights: [45, 30, 15, 7, 3] },
  silver: { key: "silver", label: "Silver", machineWeight: 30, weights: [15, 25, 25, 20, 15] },
  gold: { key: "gold", label: "Gold", machineWeight: 10, weights: [0, 10, 20, 35, 35] },
};
const MACHINE_TIER_LIST = Object.values(MACHINE_TIERS);

function rollStars(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand(1, total);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i + 1;
  }
  return 1;
}

function rollMachineTier() {
  const total = MACHINE_TIER_LIST.reduce((s, t) => s + t.machineWeight, 0);
  let r = rand(1, total);
  for (const tier of MACHINE_TIER_LIST) {
    r -= tier.machineWeight;
    if (r <= 0) return tier;
  }
  return MACHINE_TIERS.bronze;
}

function genStaffStats(stars) {
  const base = 20 + stars * 12;
  const stats = {};
  MANAGER_STAT_KEYS.forEach((k) => { stats[k] = Math.min(99, base + rand(-6, 6)); });
  return stats;
}

function genOnlineStaffCard(tier) {
  const stars = rollStars(tier.weights);
  const isManager = Math.random() < 0.3;
  return {
    cardId: uid("card"),
    type: isManager ? "MANAGER" : "COACH",
    specialty: isManager ? null : choice(COACH_SPECIALTIES),
    stars,
    name: choice(FIRST_NAMES) + " " + choice(LAST_NAMES),
    stats: genStaffStats(stars),
  };
}

function parseGs(json) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function calendarDayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** หยอดตู้ 1 ครั้ง — ใช้สิทธิ์ฟรีก่อน เหลือ 0 แล้วค่อยตัดเหรียญ, ไม่มีทั้งคู่โยนพลาด */
export async function pullStaffMachine(userId) {
  const club = await prisma.club.findFirst({ where: { userId } });
  if (!club) throw new Error("ไม่พบสโมสร");
  const gs = parseGs(club.gameStateJson);
  const today = calendarDayKey();
  if (gs.staffFreeDrawResetDate !== today) {
    gs.staffFreeDrawsLeft = DAILY_STAFF_CARD_DRAWS;
    gs.staffFreeDrawResetDate = today;
  }
  if (gs.staffFreeDrawsLeft == null) gs.staffFreeDrawsLeft = DAILY_STAFF_CARD_DRAWS;
  if (gs.staffDrawTickets == null) gs.staffDrawTickets = 0;

  let source;
  if (gs.staffFreeDrawsLeft > 0) {
    gs.staffFreeDrawsLeft -= 1;
    source = "free";
  } else if (gs.staffDrawTickets > 0) {
    gs.staffDrawTickets -= 1;
    source = "coin";
  } else {
    throw new Error("หยอดตู้ไม่ได้ — สิทธิ์ฟรีวันนี้หมดและไม่มีเหรียญตู้เหลือ");
  }

  const tier = rollMachineTier();
  const cards = Array.from({ length: CARDS_PER_STAFF_PULL }, () => genOnlineStaffCard(tier));
  gs.staffCardBag = [...(gs.staffCardBag || []), ...cards];
  gs.lastStaffPull = cards;

  await prisma.club.update({ where: { id: club.id }, data: { gameStateJson: JSON.stringify(gs) } });

  return {
    source,
    tier: { key: tier.key, label: tier.label },
    cards,
    staffDraws: {
      freeLeft: gs.staffFreeDrawsLeft,
      dailyLimit: DAILY_STAFF_CARD_DRAWS,
      tickets: gs.staffDrawTickets,
      resetDate: gs.staffFreeDrawResetDate,
    },
    bagSize: gs.staffCardBag.length,
  };
}
