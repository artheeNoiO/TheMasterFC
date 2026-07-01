import { MATCH_DAYS_PER_SEASON } from "./constants.js";
import { uid } from "./players.js";

export function roundRobin(teamIds) {
  const arr = teamIds.slice();
  if (arr.length % 2 !== 0) arr.push(null);
  const n = arr.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds = [];
  let list = arr.slice();
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home != null && away != null) {
        roundMatches.push(r % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    rounds.push(roundMatches);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }
  return rounds;
}

export function buildSeasonFixtures(teamIds) {
  const rounds = roundRobin(teamIds);
  return rounds.map((round, ri) => ({
    day: ri + 1,
    matches: round.map(([home, away]) => ({
      id: uid("mt"),
      homeClubId: home,
      awayClubId: away,
      played: false,
      homeGoals: null,
      awayGoals: null,
    })),
  }));
}

export function emptyStanding(clubId) {
  return { clubId, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

export function applyResultToStanding(standing, goalsFor, goalsAgainst) {
  standing.played += 1;
  standing.gf += goalsFor;
  standing.ga += goalsAgainst;
  if (goalsFor > goalsAgainst) {
    standing.w += 1;
    standing.pts += 3;
  } else if (goalsFor < goalsAgainst) {
    standing.l += 1;
  } else {
    standing.d += 1;
    standing.pts += 1;
  }
  return standing;
}

export function sortStandings(standings, clubsById) {
  return [...standings].sort((a, b) => {
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  }).map((s) => ({ ...s, club: clubsById[s.clubId] }));
}

export function isSeasonComplete(dayNumber) {
  return dayNumber > MATCH_DAYS_PER_SEASON;
}
