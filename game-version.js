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

/** ตู้หยอดซองการ์ดสตาฟ (ออนไลน์) — หยอดฟรีวันละ N ครั้ง รีเซ็ตทุกวันตามเวลาจริง (ISO date)
 * เกินโควตาฟรีต้องใช้ "เหรียญตู้" (staffDrawTickets) ซึ่งหาได้จาก Battle Pass + จบฤดูกาลอันดับดี (ดู SEASON_RANK_MACHINE_COINS) */
export const DAILY_STAFF_CARD_DRAWS = 3;

/** เหรียญตู้จากอันดับท้ายฤดูกาลออนไลน์ (1 = แชมป์ดิวิชั่น) — นอกเหนือจากนี้ (อันดับท้ายตาราง) ไม่ได้เหรียญ */
export const SEASON_RANK_MACHINE_COINS = { 1: 25, 2: 18, 3: 12, 4: 8, 5: 4, 6: 4, 7: 4, 8: 4 };

/** ออนไลน์: จบ 1 ฤดูกาล (30 นัด, double round-robin เจอกันเหย้า-เยือน) ภายใน 1 วันจริง — แต่แข่งเฉพาะช่วง 8:00-20:00 (เวลาไทย) เท่านั้น
 * หลัง 20:00 ถึง 8:00 วันถัดไป = ช่วงพักฟื้นนักเตะ/อีเวนต์/ตลาดซื้อขาย (ห้ามแข่ง)
 * ห่างรอบละ (MS_PER_GAME_DAY) ตอนนี้ตั้งตายตัวที่ 15 นาที/นัด แทนที่จะคำนวณยืดตามช่วงเวลาที่เปิด/จำนวนนัด —
 * 15 นาทีนี้คือช่วง "รันตารางปฏิทินในเกมส์" ระหว่าง 2 นัด (วันฝึก/วันหยุดที่ผ่านไปในโลกเกมส์) ไม่ใช่แค่รอเฉยๆ
 * 30 นัด x 15 นาที = 7.5 ชม. จบภายในช่วง 8:00-20:00 (12 ชม.) สบายๆ เหลือช่วงพักท้ายวันก่อนตลาดเปิด */
export const MATCH_DAYS_PER_SEASON = 30;
export const ACTIVE_WINDOW_START_HOUR = 8;
export const ACTIVE_WINDOW_END_HOUR = 20;
export const ACTIVE_WINDOW_HOURS = ACTIVE_WINDOW_END_HOUR - ACTIVE_WINDOW_START_HOUR; // 12
export const MS_PER_GAME_DAY = 15 * 60 * 1000; // 15 นาทีจริง/นัด (ตายตัว ไม่ผูกกับ ACTIVE_WINDOW_HOURS อีกต่อไป)
export const MINUTES_PER_GAME_DAY = Math.round(MS_PER_GAME_DAY / 60000);
export const GAME_TIMEZONE = "Asia/Bangkok";

/** โหมดออนไลน์: แมทเตะอัตโนมัติตามเวลาจริงบนเซิร์ฟเวอร์ (ไม่มีปุ่มกดคิกอฟ/เร่งเวลาเหมือนโลกจำลอง)
 * 90 นาทีเกม = 6 นาทีจริง/แมท — เหลือเวลาพัก ~38 นาทีก่อนรอบถัดไปภายในช่วง MS_PER_GAME_DAY (~44 นาที) */
export const GAME_MINUTE_REAL_SECONDS = 4;
export const MATCH_REAL_DURATION_MS = 90 * GAME_MINUTE_REAL_SECONDS * 1000;
export const MAX_SUBS_PER_MATCH = 5;
/** เตือนผู้เล่นล่วงหน้ากี่นาทีจริง ก่อนรอบถัดไปมีสิทธิ์คิกอฟ (ดู throttle ของ day-tick) */
export const PRE_MATCH_REMINDER_MINUTES = 10;

/** ระบบดิวิชั่นออนไลน์ — ปิรามิด 5 ชั้น: Beginner → Amateur → Pro → Master → Master Legend
 * ดิวิชั่น 0 = สูงสุด (Master Legend League) ไล่ลงไปจนถึงต่ำสุด (4 = Beginner, ที่ผู้เล่นใหม่เริ่มเสมอ)
 * Beginner/Amateur/Pro ขยายห้อง(shard)อัตโนมัติไม่จำกัด (เดิมทีทุกดิวิชั่นเป็นแบบนี้)
 * Master League ล็อกตายตัว 4 ห้อง (64 ทีม), Master Legend League ล็อกตายตัว 1 ห้อง (16 ทีมซูเปอร์สตาร์)
 * — ดู DIVISION_SHARD_CAP (null = ขยายได้ไม่จำกัด, ตัวเลข = เพดานจำนวนห้องตายตัว)
 * เลื่อน/ตกชั้น 4 ขึ้น/4 ลง ทุกชั้น — Pro→Master และ Master→Legend ใช้ global ranking cap
 * (ฝั่งรับที่ตายตัว จำกัดจำนวนเข้าได้แค่เท่าที่มีที่ว่างจริงจากฝั่งตกชั้น ไม่ใช่ทุกคนที่เข้าเกณฑ์ได้ขึ้นหมด) */
export const DIVISION_COUNT = 5;
export const ENTRY_DIVISION = DIVISION_COUNT - 1; // 4 = Beginner League (ต่ำสุด/เริ่มต้น)
export const ACTIVE_DIVISIONS = [4, 3, 2, 1, 0]; // เปิดใช้ครบทุกชั้นตั้งแต่ต้น (ปิรามิดใหม่)
export const DIVISION_NAMES = {
  0: "Master Legend League", 1: "Master League", 2: "Pro League",
  3: "Amateur League", 4: "Beginner League",
};
/** null = ขยายห้องอัตโนมัติไม่จำกัด, ตัวเลข = จำนวนห้อง(shard)ตายตัวสูงสุด */
export const DIVISION_SHARD_CAP = { 0: 1, 1: 4, 2: null, 3: null, 4: null };
export const LEGEND_DIVISION = 0;
export const MASTER_DIVISION = 1;
export const PRO_DIVISION = 2;
/** ลีกซูเปอร์สตาร์ (จาก LEGEND_TEAMS/LEGEND_PLAYERS) ที่ใช้ตั้งห้อง Master Legend League จริงบนเซิร์ฟเวอร์ */
export const LEGEND_LEAGUE_ID = "england";
export const PROMOTE_COUNT = 4; // อันดับ 1-4 เลื่อนชั้น
export const RELEGATE_COUNT = 4; // 4 อันดับสุดท้ายตกชั้น

/** Battle Pass — รอบเดือนปฏิทิน (ตามเวลาไทย) ไม่ผูกกับรอบดิวิชั่น/ฤดูกาล
 * XP ได้จาก: ผลแมทลีค (ชนะ/เสมอ/แพ้), login รายวัน — เควสรายวัน/รายสัปดาห์ยังไม่ทำ (รอออกแบบเนื้อหาเควส) */
export const BP_XP_WIN = 30;
export const BP_XP_DRAW = 15;
export const BP_XP_LOSS = 5;
export const BP_XP_DAILY_LOGIN = 10;

/** ตาราง tier — xpRequired คือ XP สะสมขั้นต่ำที่ปลดล็อก tier นั้น (เรียงจากน้อยไปมาก)
 * reward.type==="coin" คือเหรียญตู้การ์ดสตาฟ (1 เหรียญ = หยอดตู้ได้ 1 ครั้ง) — เคลียร์ทั้ง pass ได้ ~23 เหรียญ/เดือน */
export const BATTLE_PASS_TIERS = [
  { tier: 1, xpRequired: 0, reward: { type: "coin", amount: 2 } },
  { tier: 2, xpRequired: 100, reward: { type: "coin", amount: 2 } },
  { tier: 3, xpRequired: 220, reward: { type: "cosmetic", id: "kit_trim_gold" } },
  { tier: 4, xpRequired: 360, reward: { type: "coin", amount: 3 } },
  { tier: 5, xpRequired: 520, reward: { type: "staffCard", rarity: "rare" } },
  { tier: 6, xpRequired: 700, reward: { type: "coin", amount: 3 } },
  { tier: 7, xpRequired: 900, reward: { type: "cosmetic", id: "crest_effect_flame" } },
  { tier: 8, xpRequired: 1120, reward: { type: "coin", amount: 5 } },
  { tier: 9, xpRequired: 1360, reward: { type: "staffCard", rarity: "epic" } },
  { tier: 10, xpRequired: 1620, reward: { type: "coin", amount: 8 } },
];

/** เดือนปัจจุบันตามเวลาไทย ในรูป "YYYY-MM" — ใช้เป็น key ของ BattlePassProgress และตัวเทียบรีเซ็ตรายเดือน */
export function currentSeasonMonth(date = new Date()) {
  var parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GAME_TIMEZONE, year: "numeric", month: "2-digit",
  }).formatToParts(date);
  var y = parts.find((p) => p.type === "year").value;
  var m = parts.find((p) => p.type === "month").value;
  return y + "-" + m;
}

/** วันที่ปัจจุบันตามเวลาไทย ในรูป "YYYY-MM-DD" — กันเช็ค login ซ้ำวันเดียวกัน */
export function currentGameDay(date = new Date()) {
  var parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GAME_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return parts.find((p) => p.type === "year").value + "-" +
    parts.find((p) => p.type === "month").value + "-" +
    parts.find((p) => p.type === "day").value;
}

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
