import { getLegendsForTeam, LEGEND_PLAYERS, LEGEND_TEAMS } from "../../../legend-universe.js";
import { starWageMultiplier } from "../../../player-stars.js";
import { genPlayer, genSquad, clamp, rand } from "./players.js";
import { bumpAttrs, recomputeDerived } from "./players.js";

export { LEGEND_LEAGUES, LEGEND_PLAYERS, LEGEND_TEAMS, getLegendsForTeam, getLegendById, getLeagueTeams } from "../../../legend-universe.js";

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

export function buildLegendPlayer(def, teamId, homeTeamId, startDay, wageFn) {
  const tier = clamp(Math.floor((def.rating - 50) / 3), 0, 12);
  const p = genPlayer(def.position, tier, teamId, def.age, startDay);
  p.id = `leg_${def.legendId}`;
  p.legendId = def.legendId;
  p.isLegend = true;
  p.homeTeamId = homeTeamId;
  p.name = def.name;
  forcePlayerRating(p, def.rating);
  p.potential = def.potential;
  p.value = def.acquireCost;
  p.wage = wageFn ? wageFn(p.rating) : Math.max(100, Math.round(((p.rating * p.rating * 2) / 100) * starWageMultiplier(p.rating) / 100) * 100);
  p.legendLeagueId = def.leagueId;
  p.lastOwnerActivityDay = startDay || 1;
  return p;
}

export function buildLegendSquadForTeam(teamId, leagueId, teamKey, tier, startDay, wageFn) {
  const squad = genSquad(teamId, tier);
  const legends = getLegendsForTeam(leagueId, teamKey);
  legends.forEach((leg) => {
    const legP = buildLegendPlayer(leg, teamId, teamId, startDay, wageFn);
    const idx = squad.findIndex((p) => p.position === leg.position && !p.isLegend);
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
