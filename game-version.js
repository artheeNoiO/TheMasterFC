/**
 * The Master Football Club — game & save versioning
 * Bump GAME_VERSION for releases; bump SAVE_VERSION only on breaking save-schema changes.
 */

/** Display name (single source of truth for UI, bats, meta tags) */
export const GAME_NAME = "The Master Football Club";

/** Short label for tight UI (headers, window titles) */
export const GAME_NAME_SHORT = "The Master FC";

/** Marketing tagline */
export const GAME_TAGLINE = "Build your team. Build your dream. Be number one.";

/** Production URLs (local dev uses localhost) */
export const GAME_SITE_URL = "https://www.themasterfc.com";
export const GAME_API_URL = "https://api.themasterfc.com";

/** Donation — set URL when ready (Ko-fi, PayPal, PromptPay page, etc.) */
export const GAME_DONATE_URL = "";
export const GAME_DONATE_LABEL = "Support development";

/** Community Discord — feedback & playtest chat */
export const GAME_DISCORD_URL = "https://discord.gg/arEP4BPFb";
export const GAME_DISCORD_LABEL = "Join Discord";
export const GAME_DISCORD_HINT =
  "เล่นแล้วชอบหรือไม่ชอบอะไร — เขียน feedback ได้ที่นี่หรือใน Discord ทีมอ่านทุกข้อความ";

/** Premium / event currency label (Socker Coins in-game may map here later) */
export const MASTER_COIN_LABEL = "Master Coin";

export const GAME_VERSION = "0.9.24";

/** Frozen baseline tag — same as GAME_VERSION after a stable release */
export const STABLE_VERSION = "0.9.0";
export const STABLE_TAG = "v0.9.0-stable";

/** Beta test — ปิดเป็น false เมื่อจบช่วงทดสอบ */
export const BETA_TEST = true;
export const BETA_STARTING_BUDGET = 500_000_000;
export const BETA_STARTER_MASTER_COINS = 1000;
export const BETA_LABEL = "TEST BETA";
export const BETA_HEADLINE = "ช่วงทดสอบ Test Beta";
export const BETA_MESSAGE =
  "เกมอยู่ระหว่างพัฒนา — ระบบอาจเปลี่ยน ข้อมูลอาจรีเซ็ต แจ้งบั๊กและความคิดเห็นได้ที่ Discord";
export const BETA_PERKS =
  "ผู้ทดสอบ: งบสโมสร 500M · Master Coin 1,000 · สมัคร Game ID ฟรี";
/** รางวัลช่วง Test Beta — แสดงบนเว็บ */
export const BETA_MASTER_REWARD =
  "เล่นจนถึง Master League ในช่วง Test Beta — รับรางวัล Limited Edition";
export const BETA_MASTER_REWARD_SHORT =
  "ถึง Master League ใน Test Beta → รางวัล Limited";

/** งบเริ่มต้นผู้เล่นใหม่ (โลกจำลอง + online shard) */
export const STARTING_BUDGET = BETA_TEST ? BETA_STARTING_BUDGET : 10_000_000;

/** Master Coin / Socker Coin ตอนสร้างโปรไฟล์ใหม่ */
export const STARTER_MASTER_COINS = BETA_TEST ? BETA_STARTER_MASTER_COINS : 10;

/** เปิดซองการ์ดสตาฟฟรี — รีเซ็ตทุกวันตามเวลาจริง (ISO date) */
export const DAILY_STAFF_CARD_DRAWS = 100;

/** ออนไลน์: จบ 1 ฤดูกาล (15 นัด) ภายใน 1 วันจริง — แต่แข่งเฉพาะช่วง 9:00-20:00 (เวลาไทย) เท่านั้น
 * หลัง 20:00 ถึง 9:00 วันถัดไป = ช่วงพักฟื้นนักเตะ/อีเวนต์/ตลาดซื้อขาย (ห้ามแข่ง) */
export const MATCH_DAYS_PER_SEASON = 15;
export const ACTIVE_WINDOW_START_HOUR = 9;
export const ACTIVE_WINDOW_END_HOUR = 20;
export const ACTIVE_WINDOW_HOURS = ACTIVE_WINDOW_END_HOUR - ACTIVE_WINDOW_START_HOUR; // 11
export const MS_PER_GAME_DAY = Math.floor((ACTIVE_WINDOW_HOURS * 3600 * 1000) / MATCH_DAYS_PER_SEASON);
export const MINUTES_PER_GAME_DAY = Math.round(MS_PER_GAME_DAY / 60000);
export const GAME_TIMEZONE = "Asia/Bangkok";

/** โหมดออนไลน์: แมทเตะอัตโนมัติตามเวลาจริงบนเซิร์ฟเวอร์ (ไม่มีปุ่มกดคิกอฟ/เร่งเวลาเหมือนโลกจำลอง)
 * 90 นาทีเกม = 6 นาทีจริง/แมท — เหลือเวลาพัก ~38 นาทีก่อนรอบถัดไปภายในช่วง MS_PER_GAME_DAY (~44 นาที) */
export const GAME_MINUTE_REAL_SECONDS = 4;
export const MATCH_REAL_DURATION_MS = 90 * GAME_MINUTE_REAL_SECONDS * 1000;
export const MAX_SUBS_PER_MATCH = 5;
/** เตือนผู้เล่นล่วงหน้ากี่นาทีจริง ก่อนรอบถัดไปมีสิทธิ์คิกอฟ (ดู throttle ของ day-tick) */
export const PRE_MATCH_REMINDER_MINUTES = 10;

/** ระบบดิวิชั่นออนไลน์ — ดิวิชั่น 0 = สูงสุด (Master League) ไล่ลงไปจนถึงต่ำสุด (entry) ตามธรรมเนียม
 * เดียวกับที่ sandbox ใช้อยู่แล้ว (division 0 = Master, 1 = Challenger) — โครงสร้างรองรับ 6 ชั้นเต็ม
 * แต่ตอนนี้ผู้เล่นยังน้อย (Test Beta) เลยเปิดใช้จริงแค่ 2 ชั้นล่างสุดก่อน (ดู ACTIVE_DIVISIONS) ค่อยเปิด
 * ชั้นบนเพิ่มเมื่อผู้เล่นจริงเยอะขึ้น — ผู้เล่นใหม่เริ่มที่ ENTRY_DIVISION เท่านั้น ไต่ขึ้นด้วยผลงานเอา */
export const DIVISION_COUNT = 6;
export const ENTRY_DIVISION = DIVISION_COUNT - 1; // 5 = ต่ำสุด/เริ่มต้น
export const ACTIVE_DIVISIONS = [5, 4]; // เปิดจริงตอนนี้ — เพิ่มทีละชั้นเมื่อผู้เล่นเยอะขึ้น
export const DIVISION_NAMES = {
  0: "Master League", 1: "Elite League", 2: "Championship League",
  3: "Division 3", 4: "Division 2", 5: "Challenger League",
};
export const PROMOTE_COUNT = 2; // อันดับ 1-2 เลื่อนชั้น
export const RELEGATE_COUNT = 2; // 2 อันดับสุดท้ายตกชั้น

/** ชั่วโมงปัจจุบันตามเวลาไทย (0-23, รวมเศษนาทีเป็นทศนิยม) — ไม่พึ่ง timezone ของเครื่อง/เซิร์ฟเวอร์ */
export function bangkokHourNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GAME_TIMEZONE, hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/** true ระหว่าง 9:00-20:00 เวลาไทย — ช่วงที่แข่งขันได้ (day-tick เดินได้, ห้ามซื้อขาย) */
export function isMatchWindowOpen(date = new Date()) {
  const h = bangkokHourNow(date);
  return h >= ACTIVE_WINDOW_START_HOUR && h < ACTIVE_WINDOW_END_HOUR;
}

/** true ระหว่าง 20:00-9:00 เวลาไทย — ช่วงพักฟื้น/อีเวนต์/ตลาดซื้อขาย (ห้ามแข่ง) */
export function isMarketWindowOpen(date = new Date()) {
  return !isMatchWindowOpen(date);
}

/** @deprecated ใช้ DAILY_STAFF_CARD_DRAWS */
export const DAILY_FREE_STAFF_DRAWS = DAILY_STAFF_CARD_DRAWS;

/** Integer — increments when save migrations are required */
export const SAVE_VERSION = 12;

/**
 * UI / feature gates keyed off save version (applied after migrateCareerSave).
 * Prevents old saves from flipping between competing implementations.
 */
export const FEATURES = {
  squadOwnTab: SAVE_VERSION >= 4,
  legendCompactUI: SAVE_VERSION >= 4,
  /** Master League (division 0): any table rank may acquire legends */
  legendMasterAnyRank: SAVE_VERSION >= 4,
  staffCardGacha: SAVE_VERSION >= 5,
  playerNationality: SAVE_VERSION >= 6,
  economyBalanceV3: SAVE_VERSION >= 7,
  economyStarWages: SAVE_VERSION >= 8,
  clubSystems: SAVE_VERSION >= 9,
  /** Full real-world rosters for Big 5 master leagues */
  fullRosterDB: SAVE_VERSION >= 11,
  roadmapTierAB: SAVE_VERSION >= 12,
};

/** Human-readable migration notes (mirrors CHANGELOG save entries) */
export const SAVE_MIGRATION_NOTES = {
  1: "Squad balance — top-up squads to template, refresh lineups",
  2: "Economy v2 — wage scaling, fans, sponsor, merch hooks",
  3: "Market scout split — youth vs market scouts, scout finds",
  4: "Squad own nav tab, legend any Master rank, compact legend UI",
  5: "Staff card gacha — tickets, bag, merge, daily free draws",
  6: "Player nationality + Latin-script names (Thai romanized)",
  7: "Economy v3 — lower daily wages, reserve wage discount, higher sponsor/merch/match income",
  8: "Star-tier wages — 1–4★ players paid much less than 5–7★",
  9: "Club systems — stadium upgrades, board satisfaction, extra staff bonuses",
  10: "Training reports + Analyst training recommendations",
  11: "Full rosters — ~23 players/team, all 8 legend leagues (~2,944 players)",
  12: "Roadmap Tier A/B — FFP, board sack, contracts, shadow squad, scouting zones, derby, World Cup stub, press, conversations, xG, injury depth, pre-season, B-team",
};
