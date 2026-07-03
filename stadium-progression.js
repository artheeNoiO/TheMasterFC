/**
 * Stadium progression — system UI helpers (art assets wired later).
 */
import { getStadiumLevel, STADIUM_LEVELS } from "./club-systems.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function stadiumProgressSteps(currentLevel) {
  return STADIUM_LEVELS.map((def, i) => ({
    level: def.level,
    nameTh: def.nameTh,
    nameEn: def.nameEn,
    capacity: def.capacity,
    fanCapBonus: def.fanCapBonus,
    matchRevMult: def.matchRevMult,
    unlocked: i + 1 <= currentLevel,
    current: i + 1 === currentLevel,
  }));
}

export function stadiumLevelLabel(level, lang = "th") {
  const def = STADIUM_LEVELS[clamp(level, 1, STADIUM_LEVELS.length) - 1];
  return lang === "en" ? def.nameEn : def.nameTh;
}

/** AI home stadium tier from division (Master = big, Challenger = small). */
export function resolveHomeStadiumLevel(career, homeTeamId) {
  if (homeTeamId === career.userTeamId) return getStadiumLevel(career);
  const team = career.teams?.find((t) => t.id === homeTeamId);
  const div = team?.division ?? 4;
  return clamp(5 - div, 1, STADIUM_LEVELS.length);
}
