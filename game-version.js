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

/** Premium / event currency label (Socker Coins in-game may map here later) */
export const MASTER_COIN_LABEL = "Master Coin";

export const GAME_VERSION = "0.9.0";

/** Frozen baseline tag — same as GAME_VERSION after a stable release */
export const STABLE_VERSION = "0.9.0";
export const STABLE_TAG = "v0.9.0-stable";

/** งบเริ่มต้นผู้เล่นใหม่ (โลกจำลอง + online shard) */
export const STARTING_BUDGET = 10_000_000;

/** Integer — increments when save migrations are required */
export const SAVE_VERSION = 5;

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
};

/** Human-readable migration notes (mirrors CHANGELOG save entries) */
export const SAVE_MIGRATION_NOTES = {
  1: "Squad balance — top-up squads to template, refresh lineups",
  2: "Economy v2 — wage scaling, fans, sponsor, merch hooks",
  3: "Market scout split — youth vs market scouts, scout finds",
  4: "Squad own nav tab, legend any Master rank, compact legend UI",
  5: "Staff card gacha — tickets, bag, merge, daily free draws",
};
