/**
 * The Socker Manager — game & save versioning
 * Bump GAME_VERSION for releases; bump SAVE_VERSION only on breaking save-schema changes.
 */

export const GAME_VERSION = "0.8.0";

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
