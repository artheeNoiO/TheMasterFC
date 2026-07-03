#!/usr/bin/env node
/**
 * Generates roster-database/rosters.generated.js from raw-squads/*.mjs
 * Run: node scripts/generate-master-rosters.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parodyName, slugId, acquireCostFromRating, isLegendStar } from "../roster-database/parody.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "roster-database", "raw-squads");
const OUT = path.join(ROOT, "roster-database", "rosters.generated.js");

const LEAGUES = ["england", "spain", "germany", "france", "italy", "portugal", "saudi", "thailand"];

async function loadRaw(leagueId) {
  const fp = path.join(RAW_DIR, `${leagueId}.mjs`);
  if (!fs.existsSync(fp)) {
    console.warn(`Missing ${fp}`);
    return {};
  }
  const mod = await import(pathToFileURL(fp).href);
  return mod.default || mod.RAW || {};
}

function buildRoster(leagueId, teamKey, rows) {
  const sorted = [...rows].sort((a, b) => b[3] - a[3]);
  return sorted.map((row, rankIdx) => {
    const [position, realName, age, rating, nationality] = row;
    const rosterId = slugId(leagueId, teamKey, realName);
    const legend = isLegendStar(rating, rankIdx);
    const potential = age <= 21
      ? Math.min(99, rating + Math.round((95 - rating) * 0.6))
      : age <= 24
        ? Math.min(99, rating + Math.round((93 - rating) * 0.35))
        : age <= 27
          ? Math.min(99, rating + 3)
          : rating;
    return {
      rosterId,
      name: parodyName(realName),
      position,
      rating,
      potential,
      age,
      teamKey,
      leagueId,
      ...(nationality ? { nationality } : {}),
      ...(legend ? { isLegend: true, acquireCost: acquireCostFromRating(rating) } : {}),
    };
  });
}

async function main() {
  const all = [];
  const counts = {};

  for (const leagueId of LEAGUES) {
    const teams = await loadRaw(leagueId);
    counts[leagueId] = 0;
    for (const [teamKey, rows] of Object.entries(teams)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const roster = buildRoster(leagueId, teamKey, rows);
      all.push(...roster);
      counts[leagueId] += roster.length;
    }
  }

  const legends = all.filter((p) => p.isLegend);

  const body = `/** AUTO-GENERATED — node scripts/generate-master-rosters.mjs */
/** ${all.length} roster players · ${legends.length} acquirable legends · 8 legend leagues */

export const ROSTER_PLAYERS = ${JSON.stringify(all, null, 0)};

export const ROSTER_STATS = ${JSON.stringify({ total: all.length, legends: legends.length, byLeague: counts }, null, 2)};
`;

  fs.writeFileSync(OUT, body, "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(`Total: ${all.length} players, ${legends.length} legends`);
  console.log("By league:", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
