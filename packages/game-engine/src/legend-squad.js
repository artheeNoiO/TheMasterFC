import {
  getLegendsForTeam, LEGEND_PLAYERS, LEGEND_TEAMS,
  getRosterForTeam, hasFullRosterLeague, legendNationality,
} from "../../../legend-universe.js";
import { starWageMultiplier } from "../../../player-stars.js";
import { genPlayer, genSquad, clamp, rand } from "./players.js";
import { bumpAttrs, recomputeDerived } from "./players.js";

export {
  LEGEND_LEAGUES, LEGEND_PLAYERS, LEGEND_TEAMS, ROSTER_PLAYERS,
  getLegendsForTeam, getLegendById, getLeagueTeams, getRosterForTeam, hasFullRosterLeague, isBigFiveLeague,
} from "../../../legend-universe.js";

export function forcePlayerRating(p, targetRating) {
  const diff = targetRating - p.rating;
  bumpAttrs(p, diff * 0.12);
  recomputeDerived(p);
  if (Math.abs(p.rating - targetRating) > 2) {
    const scale = targetRating / Math.max(p.rating, 1);
    p.attack = clamp(Math.round(p.attack * scale), 5, 99);
    p.defense = clamp(Math.round(p.defense * scale), 5, 99);
    p.rating = targetRating;
  }
}

function defaultWage(rating, wageFn) {
  return wageFn
    ? wageFn(rating)
    : Math.max(100, Math.round(((rating * rating * 2) / 100) * starWageMultiplier(rating) / 100) * 100);
}

export function buildRosterPlayer(def, teamId, homeTeamId, startDay, wageFn) {
  const tier = clamp(Math.floor((def.rating - 50) / 3), 0, 12);
  const nat = legendNationality(def);
  const p = genPlayer(def.position, tier, teamId, def.age, startDay);
  p.nationality = nat;
  const rid = def.rosterId || def.legendId;
  p.id = def.isLegend ? `leg_${rid}` : `ros_${rid}`;
  p.rosterId = rid;
  if (def.isLegend) {
    p.legendId = rid;
    p.isLegend = true;
    p.value = def.acquireCost;
  } else {
    p.isLegend = false;
    const ageMult = def.age <= 23 ? 1.35 : def.age <= 28 ? 1.05 : def.age <= 31 ? 0.65 : 0.35;
    p.value = Math.round((def.rating * def.rating * 380 * ageMult) / 1000) * 1000;
  }
  p.homeTeamId = homeTeamId;
  p.name = def.name;
  forcePlayerRating(p, def.rating);
  p.potential = def.potential;
  p.wage = defaultWage(p.rating, wageFn);
  p.legendLeagueId = def.leagueId;
  p.lastOwnerActivityDay = startDay || 1;
  return p;
}

export function buildLegendPlayer(def, teamId, homeTeamId, startDay, wageFn) {
  return buildRosterPlayer({ ...def, isLegend: true, rosterId: def.legendId || def.rosterId }, teamId, homeTeamId, startDay, wageFn);
}

export function buildLegendSquadForTeam(teamId, leagueId, teamKey, tier, startDay, wageFn) {
  if (hasFullRosterLeague(leagueId)) {
    const roster = getRosterForTeam(leagueId, teamKey);
    if (roster.length) return roster.map((def) => buildRosterPlayer(def, teamId, teamId, startDay, wageFn));
  }
  const squad = genSquad(teamId, tier);
  const legends = getLegendsForTeam(leagueId, teamKey);
  legends.forEach((leg) => {
    const legP = buildLegendPlayer(leg, teamId, teamId, startDay, wageFn);
    const idx = squad.findIndex((pl) => pl.position === leg.position && !pl.isLegend);
    if (idx >= 0) squad[idx] = legP;
    else squad.push(legP);
  });
  return squad;
}

export function createLegendMasterTeamDefs(leagueId) {
  return (LEGEND_TEAMS[leagueId] || []).map((t, idx) => ({
    ...t,
    idx,
    division: 0,
    formation: t.formation || "4-4-2",
  }));
}

export function initLegendOwnership(leagueId, teams, players) {
  const ownership = {};
  LEGEND_PLAYERS.filter((l) => l.leagueId === leagueId).forEach((l) => {
    const homeTeam = teams.find((t) => t.legendTeamKey === l.teamKey);
    const p = players.find((pl) => pl.legendId === l.legendId);
    ownership[l.legendId] = p?.teamId || homeTeam?.id || null;
  });
  return ownership;
}
