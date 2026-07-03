import { FORMATIONS, MATCHUP_CYCLE } from "./constants.js";
import { clamp } from "./players.js";

function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function matchupMultiplier(mine, theirs) {
  if (mine === theirs) return 1.0;
  const i = MATCHUP_CYCLE.indexOf(mine);
  const j = MATCHUP_CYCLE.indexOf(theirs);
  if (i === -1 || j === -1) return 1.0;
  if ((i + 1) % 4 === j) return 1.06;
  if ((j + 1) % 4 === i) return 0.94;
  return 1.0;
}

const ROLE_ATK_MULT = { balanced: 1, attacking: 1.15, defensive: 0.85 };
const ROLE_DEF_MULT = { balanced: 1, attacking: 0.85, defensive: 1.15 };

export function getBestXI(squad, formationKey, { excludeInjured = true } = {}) {
  const counts = FORMATIONS[formationKey].counts;
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  squad.forEach((p) => {
    if (byPos[p.position] && (!excludeInjured || p.injuryDays <= 0)) byPos[p.position].push(p);
  });
  Object.keys(byPos).forEach((k) => {
    byPos[k].sort((a, b) => (b.rating * (b.stamina / 100 * 0.3 + 0.7)) - (a.rating * (a.stamina / 100 * 0.3 + 0.7)));
  });
  const xi = [];
  Object.keys(counts).forEach((pos) => {
    for (let i = 0; i < counts[pos]; i++) if (byPos[pos][i]) xi.push(byPos[pos][i].id);
  });
  return xi;
}

function teamAttackDefense(squad, xiIds) {
  const xi = squad.filter((p) => xiIds.includes(p.id));
  if (xi.length === 0) return { attack: 40, defense: 40, avgStamina: 100, avgMorale: 75 };
  const attackers = xi.filter((p) => p.position === "FW" || p.position === "MF");
  const defenders = xi.filter((p) => p.position === "DF" || p.position === "GK");
  const avg = (arr, key) => (arr.length ? arr.reduce((s, p) => s + p[key], 0) / arr.length : 45);
  const attack = attackers.length
    ? attackers.reduce((s, p) => s + p.attack * (ROLE_ATK_MULT[p.role] || 1), 0) / attackers.length
    : avg(xi, "attack");
  const defense = defenders.length
    ? defenders.reduce((s, p) => s + p.defense * (ROLE_DEF_MULT[p.role] || 1), 0) / defenders.length
    : avg(xi, "defense");
  return { attack, defense, avgStamina: avg(xi, "stamina"), avgMorale: avg(xi, "morale") };
}

function teamPerformanceMult({ formation, manager, avgStamina, avgMorale, chemistry, isHome, opponentFormation }) {
  const staminaMult = clamp(0.72 + 0.28 * (avgStamina / 100), 0.72, 1.0);
  const psych = manager ? manager.stats.manManagement : 45;
  const moraleMult = clamp(1 + ((avgMorale - 70) / 300) * (psych / 70), 0.85, 1.16);
  const tacticFitMult = manager ? (manager.preferredFormation === formation ? 1.08 : 0.96) : 1.0;
  const matchupMult = matchupMultiplier(formation, opponentFormation);
  const chemistryMult = clamp(0.94 + 0.11 * (chemistry / 100), 0.94, 1.05);
  const homeMult = isHome ? 1.1 : 0.93;
  return staminaMult * moraleMult * tacticFitMult * matchupMult * chemistryMult * homeMult;
}

function expectedGoalsFull(homeCtx, awayCtx) {
  const xgHome = clamp(1.3 * (homeCtx.effAttack / Math.max(30, awayCtx.effDefense)), 0.2, 4.3);
  const xgAway = clamp(1.3 * (awayCtx.effAttack / Math.max(30, homeCtx.effDefense)), 0.15, 4.0);
  return { xgHome, xgAway };
}

function buildMatchContext(team, squad, xiIds, opponentFormation, isHome, chemistry) {
  const { attack, defense, avgStamina, avgMorale } = teamAttackDefense(squad, xiIds);
  const mult = teamPerformanceMult({
    formation: team.formation, manager: team.manager,
    avgStamina, avgMorale, chemistry, isHome, opponentFormation,
  });
  return { effAttack: attack * mult, effDefense: defense * mult, mult, avgStamina, avgMorale };
}

export function simulateInstant(homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI, homeChem, awayChem) {
  const hc = buildMatchContext(homeTeam, homeSquad, homeXI, awayTeam.formation, true, homeChem);
  const ac = buildMatchContext(awayTeam, awaySquad, awayXI, homeTeam.formation, false, awayChem);
  const { xgHome, xgAway } = expectedGoalsFull(hc, ac);
  return { homeGoals: poisson(xgHome), awayGoals: poisson(xgAway), xgHome, xgAway };
}

export function applyMatchWear(squad, xiIds) {
  squad.forEach((p) => {
    if (xiIds.includes(p.id)) {
      p.stamina = clamp(p.stamina - Math.floor(Math.random() * 9) - 10, 5, 100);
      p.careerApps = (p.careerApps || 0) + 1;
      if (Math.random() < clamp((100 - p.stamina) / 100 * 0.06 + 0.004, 0.003, 0.07)) {
        p.injuryDays = Math.max(1, Math.floor(Math.random() * 7) + 1);
      }
    }
  });
}

export function recoverStaminaAll(players) {
  players.forEach((p) => {
    p.stamina = clamp(p.stamina + 12, 0, 100);
    if (p.injuryDays > 0) p.injuryDays -= 1;
  });
}
