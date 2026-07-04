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

/** ออนไลน์: จบ 1 ฤดูกาล (15 นัด) ภายใน 24 ชม. จริง → ~96 นาที/นัด */
export const MATCH_DAYS_PER_SEASON = 15;
export const SEASON_REAL_HOURS = 24;
export const MS_PER_GAME_DAY = Math.floor((SEASON_REAL_HOURS * 3600 * 1000) / MATCH_DAYS_PER_SEASON);
export const MINUTES_PER_GAME_DAY = Math.round(MS_PER_GAME_DAY / 60000);

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
