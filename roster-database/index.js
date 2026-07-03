import { ROSTER_PLAYERS, ROSTER_STATS } from "./rosters.generated.js";

export { ROSTER_PLAYERS, ROSTER_STATS };

/** Acquirable superstars (unique per server online). */
export const LEGEND_PLAYERS = ROSTER_PLAYERS.filter((p) => p.isLegend).map((p) => ({
  ...p,
  legendId: p.rosterId,
}));

const rosterByTeam = new Map();
const rosterById = new Map();
const legendById = new Map();

for (const p of ROSTER_PLAYERS) {
  rosterById.set(p.rosterId, p);
  const k = `${p.leagueId}:${p.teamKey}`;
  if (!rosterByTeam.has(k)) rosterByTeam.set(k, []);
  rosterByTeam.get(k).push(p);
  if (p.isLegend) legendById.set(p.rosterId, { ...p, legendId: p.rosterId });
}

export function getRosterForTeam(leagueId, teamKey) {
  return rosterByTeam.get(`${leagueId}:${teamKey}`) || [];
}

export function getRosterById(rosterId) {
  return rosterById.get(rosterId);
}

export function getLegendById(legendId) {
  return legendById.get(legendId) || LEGEND_PLAYERS.find((p) => p.legendId === legendId);
}

export function getLegendsForLeague(leagueId) {
  return LEGEND_PLAYERS.filter((p) => p.leagueId === leagueId);
}

export function getLegendsForTeam(leagueId, teamKey) {
  return getRosterForTeam(leagueId, teamKey).filter((p) => p.isLegend);
}

export function getRosterForLeague(leagueId) {
  return ROSTER_PLAYERS.filter((p) => p.leagueId === leagueId);
}

export const FULL_ROSTER_LEAGUES = [
  "england", "spain", "italy", "germany", "france",
  "portugal", "saudi", "thailand",
];

/** @deprecated use hasFullRosterLeague */
export const BIG_FIVE_LEAGUES = FULL_ROSTER_LEAGUES.slice(0, 5);

export function hasFullRosterLeague(leagueId) {
  return FULL_ROSTER_LEAGUES.includes(leagueId);
}

export function isBigFiveLeague(leagueId) {
  return hasFullRosterLeague(leagueId);
}
