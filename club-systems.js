/**
 * Club meta-systems — stadium, board, extra staff bonuses (non-live-match).
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const STADIUM_LEVELS = [
  { level: 1, nameTh: "สนามท้องถิ่น", nameEn: "Local Ground", capacity: 3500, fanCapBonus: 0, matchRevMult: 1.0 },
  { level: 2, nameTh: "สนามชุมชน", nameEn: "Community Stadium", capacity: 8000, fanCapBonus: 2500, matchRevMult: 1.12 },
  { level: 3, nameTh: "สนามเมือง", nameEn: "Town Stadium", capacity: 18000, fanCapBonus: 8000, matchRevMult: 1.22 },
  { level: 4, nameTh: "สนามมาตรฐานลีก", nameEn: "League Standard", capacity: 35000, fanCapBonus: 18000, matchRevMult: 1.32 },
  { level: 5, nameTh: "อารena สโมสร", nameEn: "Club Arena", capacity: 55000, fanCapBonus: 35000, matchRevMult: 1.45 },
  { level: 6, nameTh: "สเตเดียมภูมิภาค", nameEn: "Regional Stadium", capacity: 68000, fanCapBonus: 45000, matchRevMult: 1.55 },
  { level: 7, nameTh: "สเตเดียมระดับชาติ", nameEn: "National Stadium", capacity: 80000, fanCapBonus: 55000, matchRevMult: 1.65 },
  { level: 8, nameTh: "เมกะสเตเดียม", nameEn: "Mega Stadium", capacity: 95000, fanCapBonus: 65000, matchRevMult: 1.78 },
  { level: 9, nameTh: "สเตเดียมระดับโลก", nameEn: "World-Class Stadium", capacity: 110000, fanCapBonus: 75000, matchRevMult: 1.9 },
];

/** Club Tier (1-9) — เกตหลักด้วย "แฟนบอลทั่วโลก" (globalFanbase, คนละตัวกับแฟนบอลเข้าสนาม/fanBase ที่เพดานหลักแสน)
 * แฟนบอลทั่วโลกได้จากผลงานใหญ่ (แชมป์/เลื่อนชั้น/คว้าซูเปอร์สตาร์) ไม่ใช่ชนะรายแมท — ไต่ถึง tier 9 ต้องใช้เวลาเป็นปี */
export const CLUB_TIER_THRESHOLDS = [0, 50_000, 200_000, 800_000, 3_000_000, 10_000_000, 30_000_000, 60_000_000, 120_000_000];
export const CLUB_TIER_NAMES = {
  1: "สโมสรท้องถิ่น", 2: "สโมสรระดับภูมิภาค", 3: "สโมสรที่รู้จักในประเทศ", 4: "สโมสรชั้นนำในประเทศ",
  5: "สโมสรระดับทวีป", 6: "สโมสรที่มีชื่อเสียงระดับโลก", 7: "สโมสรระดับโลกชั้นนำ", 8: "สโมสรระดับตำนาน", 9: "สโมสรระดับโลก (สูงสุด)",
};
export function getClubTier(globalFanbase) {
  let tier = 1;
  for (let i = 1; i < CLUB_TIER_THRESHOLDS.length; i++) {
    if ((globalFanbase || 0) >= CLUB_TIER_THRESHOLDS[i]) tier = i + 1;
  }
  return Math.max(1, Math.min(9, tier));
}
export function clubTierProgress(globalFanbase) {
  const tier = getClubTier(globalFanbase);
  const cur = CLUB_TIER_THRESHOLDS[tier - 1];
  const next = tier < 9 ? CLUB_TIER_THRESHOLDS[tier] : null;
  return {
    tier, name: CLUB_TIER_NAMES[tier],
    current: globalFanbase || 0, next,
    pct: next ? clamp(((globalFanbase - cur) / (next - cur)) * 100, 0, 100) : 100,
  };
}
/** ทุกห้อง (สนาม/พยาบาล/สนามซ้อม/เทคฯ) เพดานเลเวลเท่ากับ Club Tier ปัจจุบัน — ไม่ต้องเก็บเพดานแยกรายห้อง */
export function getMaxRoomLevel(globalFanbase) {
  return getClubTier(globalFanbase);
}

/** แฟนบอลทั่วโลกที่ได้จากเหตุการณ์ใหญ่ระดับฤดูกาล/สโมสร (ไม่ใช่รายแมท) */
export const GLOBAL_FANBASE_AWARDS = {
  winMatchMin: 500, winMatchMax: 2000,
  top4Finish: 50_000,
  promotion: 200_000,
  masterTop8: 500_000,
  champion: 5_000_000,
  legendSigned: 1_000_000,
  cupWin: 2_000_000,
};

/** Owner Level (1-100, ผู้เล่นคือเจ้าของสโมสร) — XP ต้องการต่อเลเวลเพิ่มขึ้นเรื่อยๆ (โค้ง RPG มาตรฐาน) */
export const OWNER_LEVEL_MAX = 100;
export const OWNER_XP_AWARDS = {
  matchPlayed: 5, win: 15, draw: 8, loss: 3,
  promotion: 500, masterTop8: 300, champion: 2000, cupWin: 1000, legendSigned: 200,
};
export function xpForNextOwnerLevel(level) {
  return Math.round(200 * Math.pow(Math.max(1, level), 1.35));
}
export function getOwnerLevelProgress(totalXp) {
  let level = 1, used = 0;
  const xp = totalXp || 0;
  while (level < OWNER_LEVEL_MAX) {
    const need = xpForNextOwnerLevel(level);
    if (used + need > xp) break;
    used += need;
    level += 1;
  }
  const need = level < OWNER_LEVEL_MAX ? xpForNextOwnerLevel(level) : null;
  return { level, xpIntoLevel: xp - used, xpForNext: need, pct: need ? clamp(((xp - used) / need) * 100, 0, 100) : 100 };
}

export const EXTRA_STAFF_EFFECTS = {
  ASSISTANT: {
    th: "มูดหลังเกม · คุ้นแผนเร็วขึ้น · ปั้นนักเตะ",
    en: "Post-match morale · faster tactic familiarity · player development",
  },
  ANALYST: {
    th: "รายงานก่อนเกมละเอียด · ส่งแผนลงสนาม · ประกบตัวอันตราย · แนะนำการฝึกรายคน",
    en: "Richer pre-match report · match prep · opposition marking · training recommendations",
  },
  DIRECTOR: {
    th: "ซื้อถูกลง · ขายแพงขึ้น · แมวมองเจอของดีขึ้น",
    en: "Cheaper signings · better sales · scout finds quality",
  },
  HEAD_MEDICAL: {
    th: "บัพเสริมหมอ+นักกายภาพให้ฟื้นเร็วขึ้น · เจ็บเกิน 5 วันสุ่มตัด 1–3 วัน (7★ 15% …) · พลังงานตอนพักฟื้นเล็กน้อย",
    en: "Boosts physio & therapist recovery · 6+ injury days: random 1–3 day cut (7★ 15% …) · small stamina rehab",
  },
};

export function getStadiumLevel(c) {
  return clamp(c?.stadiumLevel ?? 1, 1, STADIUM_LEVELS.length);
}

export function getStadiumDef(c) {
  return STADIUM_LEVELS[getStadiumLevel(c) - 1];
}

export function stadiumName(c, lang = "th") {
  const def = getStadiumDef(c);
  return lang === "en" ? def.nameEn : def.nameTh;
}

export function stadiumUpgradeCost(currentLevel) {
  const costs = [0, 4_000_000, 8_000_000, 15_000_000, 25_000_000, 45_000_000, 80_000_000, 140_000_000, 250_000_000];
  return costs[currentLevel] ?? 400_000_000;
}

export function stadiumAssetValue(c) {
  const level = getStadiumLevel(c);
  let invested = 0;
  for (let l = 1; l < level; l++) invested += stadiumUpgradeCost(l);
  return invested + level * 800_000;
}

export function stadiumFanCapBonus(c) {
  return getStadiumDef(c).fanCapBonus;
}

export function initBoard(c, uTeam) {
  const div = uTeam?.division ?? 1;
  c.board = {
    satisfaction: 72,
    targetPos: div === 0 ? 8 : 6,
    minBudget: div === 0 ? 500_000 : 250_000,
    warned: false,
    lastReviewDay: c.day || 1,
  };
}

export function boardTargetLabel(board, lang = "th") {
  if (!board) return "";
  return lang === "en" ? `Top ${board.targetPos}` : `อันดับ ${board.targetPos} ขึ้นไป`;
}

function headMedicalStars(headMed) {
  return clamp(headMed?.cardStars ?? 1, 1, 7);
}

/** ลดโอกาส/ความรุนแรงบาดเจ็บ — ใช้ผ่านบัพเสริมให้ PHYSIO (ไม่แยกส tack) */
export function headMedicalTeamBuff(headMed) {
  if (!headMed) return { physioBoostMult: 1, physioTherapistBoostMult: 1 };
  const stars = headMedicalStars(headMed);
  const boost = headMed.boost || 0;
  const mult = 1 + stars * 0.065 + boost * 0.1;
  return { physioBoostMult: mult, physioTherapistBoostMult: mult };
}

/**
 * ฟื้นวันพักรายวัน — หมอ + นักกายภาพ (หัวหน้าแพทย์บัพเสริม boost ของทั้งคู่ ไม่สุ่มแยกเอง)
 */
export function dailyMedicalRecoveryDays(physio, physiotherapist, headMed, rng = Math.random) {
  const buff = headMedicalTeamBuff(headMed);
  let recoverDays = 1;
  if (physiotherapist) {
    const eff = physiotherapist.boost * buff.physioTherapistBoostMult;
    if (rng() < clamp(eff * 0.5, 0, 0.88)) recoverDays += 1;
  }
  if (physio) {
    const eff = physio.boost * buff.physioBoostMult;
    const physioDailyChance = headMed ? clamp(eff * 0.22, 0, 0.5) : clamp(eff * 0.12, 0, 0.28);
    if (rng() < physioDailyChance) recoverDays += 1;
  }
  return recoverDays;
}

/** โอกาสสุ่มตัดวันพักเมื่อเจ็บเกิน 5 วัน — ตามดาวการ์ดเท่านั้น */
const HEAD_MED_LONG_CLEAR_CHANCE = {
  1: 0.005,
  2: 0.01,
  3: 0.02,
  4: 0.03,
  5: 0.05,
  6: 0.10,
  7: 0.15,
};

/** บัพพลังงานระหว่างพักฟื้น */
export function headMedicalRehabStaminaBonus(headMed) {
  if (!headMed) return 0;
  const stars = headMedicalStars(headMed);
  return clamp(1 + Math.floor(stars * 0.28), 1, 3);
}

/**
 * สุ่มพิเศษ — เจ็บเกิน 5 วัน (6+) · ตัด 1–3 วัน (ไม่เกี่ยวกับหมอ/นักกายภาพ)
 * @returns {{ extraDays: number, longClear: boolean }}
 */
export function headMedicalLongInjuryClear(headMed, injuryDaysRemaining, rng = Math.random) {
  if (!headMed || injuryDaysRemaining <= 5) return { extraDays: 0, longClear: false };
  const stars = headMedicalStars(headMed);
  const clearChance = HEAD_MED_LONG_CLEAR_CHANCE[stars] ?? 0;
  if (rng() >= clearChance) return { extraDays: 0, longClear: false };
  return { extraDays: 1 + Math.floor(rng() * 3), longClear: true };
}

/** Bonuses from ASSISTANT / ANALYST / DIRECTOR / HEAD_MEDICAL in career.staff */
export function staffSupportBonuses(c, teamId) {
  const tid = teamId || c?.userTeamId;
  const st = (c?.staff || {})[tid] || {};
  const asst = st.ASSISTANT?.boost || 0;
  const analyst = st.ANALYST?.boost || 0;
  const director = st.DIRECTOR?.boost || 0;
  const headMedStaff = st.HEAD_MEDICAL;
  return {
    moraleBonus: Math.round(asst * 10),
    famBonusExtra: asst >= 0.2 ? 1 : 0,
    devMultBonus: asst * 0.08,
    prepMultBonus: analyst * 0.14,
    markMultBonus: analyst * 0.12,
    insightBonus: analyst * 0.1,
    scoutInsightBonus: analyst * 0.06,
    buyDiscount: director * 0.1,
    sellBonus: director * 0.08,
    scoutRatingBonus: Math.round(director * 4),
    hasAssistant: Boolean(st.ASSISTANT),
    hasAnalyst: Boolean(st.ANALYST),
    hasDirector: Boolean(st.DIRECTOR),
    hasHeadMedical: Boolean(headMedStaff),
    analystName: st.ANALYST?.name || null,
  };
}

export function mergeManagerPlanWithStaff(basePlan, staffBonuses) {
  if (!basePlan || !staffBonuses) return basePlan;
  return {
    ...basePlan,
    insight: clamp((basePlan.insight || 0.5) + (staffBonuses.insightBonus || 0), 0.32, 1),
    prepMult: clamp((basePlan.prepMult || 1) + (staffBonuses.prepMultBonus || 0), 0.82, 1.28),
    markMult: clamp((basePlan.markMult || 1) + (staffBonuses.markMultBonus || 0), 0.55, 1.35),
    moraleBonus: (basePlan.moraleBonus || 0) + (staffBonuses.moraleBonus || 0),
    devMult: (basePlan.devMult || 1) * (1 + (staffBonuses.devMultBonus || 0)),
    famBonus: (basePlan.famBonus || 0) + (staffBonuses.famBonusExtra || 0),
    negotiationPct: (basePlan.negotiationPct || 0) + (staffBonuses.buyDiscount || 0),
  };
}

export function tablePosition(c, teamId, division) {
  const league = c.leagues?.[division];
  if (!league?.table) return 16;
  const rows = Object.entries(league.table)
    .map(([id, row]) => ({ id, pts: row.pts, gd: row.gf - row.ga, gf: row.gf }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const idx = rows.findIndex((r) => r.id === teamId);
  return idx >= 0 ? idx + 1 : 16;
}

/** After user match — nudge board satisfaction (instant sim + live end both call applyResult) */
export function refreshBoardAfterUserMatch(c, uTeam, homeGoals, awayGoals, isHome) {
  if (!c.board || !uTeam) return;
  const myGoals = isHome ? homeGoals : awayGoals;
  const oppGoals = isHome ? awayGoals : homeGoals;
  const pos = tablePosition(c, uTeam.id, uTeam.division);
  let delta = 0;
  if (myGoals > oppGoals) delta += 3;
  else if (myGoals === oppGoals) delta += 1;
  else delta -= 4;
  if (pos <= c.board.targetPos) delta += 2;
  else if (pos > c.board.targetPos + 4) delta -= 3;
  if ((c.budget || 0) < c.board.minBudget) delta -= 2;
  c.board.satisfaction = clamp((c.board.satisfaction || 70) + delta, 0, 100);
  c.board.lastReviewDay = c.day;
  if (c.board.satisfaction < 40 && !c.board.warned) {
    c.board.warned = true;
    c.log = [`⚠️ บอร์ดไม่พอใจ — เป้า ${boardTargetLabel(c.board)} · ความสัมพันธ์ ${c.board.satisfaction}%`, ...c.log];
  } else if (c.board.satisfaction >= 85 && c.board.warned) {
    c.board.warned = false;
    c.log = [`🤝 บอร์ดพอใจกับผลงาน — ความสัมพันธ์ ${c.board.satisfaction}%`, ...c.log];
  }
}

export function processBoardSeasonEnd(c, uTeam, finalPos) {
  if (!c.board || !uTeam) return;
  const target = c.board.targetPos;
  if (finalPos <= target) {
    const bonus = uTeam.division === 0 ? 2_500_000 : 1_500_000;
    c.budget += bonus;
    c.board.satisfaction = clamp((c.board.satisfaction || 70) + 12, 0, 100);
    c.board.warned = false;
    c.log = [`🤝 บอร์ดพอใจ — ทำเป้าอันดับ ${finalPos} (เป้า TOP ${target}) โบนัส +${bonus.toLocaleString()}฿`, ...c.log];
  } else if (finalPos <= target + 3) {
    c.board.satisfaction = clamp((c.board.satisfaction || 70) - 5, 0, 100);
    c.log = [`📋 บอร์ดรอดูต่อ — อันดับ ${finalPos} ไม่ถึงเป้า TOP ${target} แต่ยังยอมรับได้`, ...c.log];
  } else {
    const fine = uTeam.division === 0 ? 1_200_000 : 800_000;
    c.budget = Math.max(0, (c.budget || 0) - fine);
    c.board.satisfaction = clamp((c.board.satisfaction || 70) - 18, 0, 100);
    c.board.warned = true;
    c.log = [`😠 บอร์ดไม่พอใจ — อันดับ ${finalPos} ห่างเป้า · ปรับงบ -${fine.toLocaleString()}฿ · ความสัมพันธ์ ${c.board.satisfaction}%`, ...c.log];
  }
  c.board.targetPos = uTeam.division === 0 ? 8 : 6;
  c.board.minBudget = uTeam.division === 0 ? 500_000 : 250_000;
}
