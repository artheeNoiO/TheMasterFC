/**
 * Online MVP — adapter ระหว่าง gameStateJson กับ roadmap-features.js
 */
import {
  ensureRoadmapFields,
  initRoadmapOnCareer,
  runDailyRoadmapTick,
  runSeasonEndRoadmap,
  recordMatchXg,
  applyPressChoice,
  resolvePlayerConversation,
  assignScoutZone,
  addShadowTarget,
  isDerbyMatch,
  derbyMoraleBonus,
  applyInjuryToPlayer,
  evaluateBoardSack,
  SCOUT_ZONES,
  INJURY_SEVERITY,
} from "../../../roadmap-features.js";
import { initBoard, refreshBoardAfterUserMatch } from "../../../club-systems.js";

const ROADMAP_LOG_MAX = 24;

function parseGs(json) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function shardTeams(shardClubs, shard) {
  const div = shard?.division ?? 1;
  return shardClubs.map((c) => ({
    id: c.id,
    name: c.name,
    short: c.shortCode,
    shortCode: c.shortCode,
    division: div,
    tier: c.tier,
  }));
}

function standingsTable(standings) {
  const table = {};
  standings.forEach((s) => {
    table[s.clubId] = {
      played: s.played, w: s.w, d: s.d, l: s.l,
      gf: s.gf, ga: s.ga, pts: s.pts,
    };
  });
  return table;
}

function buildLeaguesArray(shard, standings) {
  const div = shard?.division ?? 1;
  const leagues = [];
  leagues[div] = { division: div, table: standingsTable(standings) };
  return leagues;
}

/** career slice สำหรับ roadmap-features */
export function buildRoadmapContext(club, shard, shardClubs, standings) {
  const gs = parseGs(club.gameStateJson);
  const roadmap = gs.roadmap || {};
  const teams = shardTeams(shardClubs, shard);
  const ctx = {
    userTeamId: club.id,
    budget: club.budget,
    day: shard.dayNumber,
    season: shard.seasonNumber,
    teams,
    leagues: buildLeaguesArray(shard, standings),
    marketScout: roadmap.marketScout ?? { grade: 2, findChance: 0.35, name: "สเกาต์ออนไลน์", weeklyWage: 0 },
    log: roadmap.log || [],
    ...roadmap,
  };
  ensureRoadmapFields(ctx);
  if (!ctx.board) {
    const uTeam = teams.find((t) => t.id === club.id) || { division: 1 };
    initBoard(ctx, uTeam);
  }
  return { ctx, gs };
}

export function persistRoadmapContext(gs, ctx) {
  const next = { ...gs };
  const {
    userTeamId, budget, day, season, teams, leagues, marketScout, log,
    ...roadmapFields
  } = ctx;
  next.roadmap = {
    ...roadmapFields,
    marketScout,
    log: (log || []).slice(0, ROADMAP_LOG_MAX),
    roadmapV12: true,
  };
  return next;
}

export function initRoadmapForNewClub(club, shard, shardClubs) {
  const { ctx, gs } = buildRoadmapContext(club, shard, shardClubs, []);
  initRoadmapOnCareer(ctx);
  ctx.preSeasonDone = true;
  ctx.log = [`🏃 Pre-season ออนไลน์ — พร้อมลงสนามวันแรก`, ...(ctx.log || [])];
  return persistRoadmapContext(gs, ctx);
}

export function getRoadmapPayload(club, shard, shardClubs, standings) {
  const { ctx } = buildRoadmapContext(club, shard, shardClubs, standings);
  return {
    ffp: ctx.ffp,
    board: ctx.board,
    rivals: ctx.rivals,
    scoutNetwork: ctx.scoutNetwork,
    shadowSquad: ctx.shadowSquad,
    delegation: ctx.delegation,
    worldCupEvent: ctx.worldCupEvent,
    bTeam: ctx.bTeam,
    lastMatchXg: ctx.lastMatchXg,
    xgHistory: ctx.xgHistory || [],
    pendingPress: ctx.pendingPress,
    pendingConversation: ctx.pendingConversation,
    managerSacked: ctx.managerSacked || false,
    sackReason: ctx.sackReason || null,
    log: ctx.log || [],
    scoutZones: SCOUT_ZONES,
    injurySeverity: INJURY_SEVERITY,
  };
}

function tablePosition(ctx, teamId) {
  const table = ctx.leagues?.[0]?.table || {};
  const rows = Object.entries(table)
    .map(([id, row]) => ({ id, pts: row.pts || 0, gd: (row.gf || 0) - (row.ga || 0), gf: row.gf || 0 }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const idx = rows.findIndex((r) => r.id === teamId);
  return idx >= 0 ? idx + 1 : 99;
}

export function applyOnlineMatchRoadmap(club, shard, shardClubs, standings, {
  match, homeGoals, awayGoals, xgHome, xgAway,
}) {
  const { ctx, gs } = buildRoadmapContext(club, shard, shardClubs, standings);
  const uTeam = ctx.teams.find((t) => t.id === club.id);
  const isHome = match.homeClubId === club.id;
  const myGoals = isHome ? homeGoals : awayGoals;
  const oppGoals = isHome ? awayGoals : homeGoals;
  const won = myGoals > oppGoals;

  refreshBoardAfterUserMatch(ctx, uTeam, homeGoals, awayGoals, isHome);

  const xgUs = isHome ? xgHome : xgAway;
  const xgThem = isHome ? xgAway : xgHome;
  const oppId = isHome ? match.awayClubId : match.homeClubId;
  const oppTeam = ctx.teams.find((t) => t.id === oppId);
  recordMatchXg(ctx, {
    xgUs, xgThem,
    homeGoals: myGoals,
    awayGoals: oppGoals,
    day: shard.dayNumber,
    opponent: oppTeam,
  });

  if (isDerbyMatch(ctx, match.homeClubId, match.awayClubId)) {
    const derbyDelta = derbyMoraleBonus(ctx, match.homeClubId, match.awayClubId, won);
    if (derbyDelta) {
      ctx.log = [`⚔️ ดาร์บี้ vs ${oppTeam?.short || "?"} — มูด ${derbyDelta >= 0 ? "+" : ""}${derbyDelta}`, ...(ctx.log || [])];
    }
  }

  const sack = evaluateBoardSack(ctx, uTeam);
  if (sack.sacked) {
    ctx.managerSacked = true;
    ctx.sackReason = sack.reason;
    ctx.log = [`🚪 ${sack.reason}`, ...(ctx.log || [])];
  }

  return persistRoadmapContext(gs, ctx);
}

export function applyOnlineDailyRoadmap(club, shard, shardClubs, standings) {
  const { ctx, gs } = buildRoadmapContext(club, shard, shardClubs, standings);
  const uTeam = ctx.teams.find((t) => t.id === club.id);
  const tick = runDailyRoadmapTick(ctx, uTeam, { genScoutFind: null });
  if (tick.logs?.length) ctx.log = [...tick.logs, ...(ctx.log || [])];
  if (tick.sacked) {
    ctx.managerSacked = true;
    ctx.sackReason = tick.reason || "บอร์ดไล่ออก";
    ctx.log = [`🚪 ${ctx.sackReason}`, ...(ctx.log || [])];
  }
  return persistRoadmapContext(gs, ctx);
}

export function applyOnlineSeasonEndRoadmap(club, shard, shardClubs, standings) {
  const { ctx, gs } = buildRoadmapContext(club, shard, shardClubs, standings);
  const uTeam = ctx.teams.find((t) => t.id === club.id);
  const pos = tablePosition(ctx, club.id);
  const sack = runSeasonEndRoadmap(ctx, uTeam, pos);
  if (sack.sacked) {
    ctx.managerSacked = true;
    ctx.sackReason = sack.reason;
    ctx.log = [`🚪 ${sack.reason}`, ...(ctx.log || [])];
  }
  ctx.youthIntakeCeremonySeason = shard.seasonNumber;
  return persistRoadmapContext(gs, ctx);
}

export function patchOnlineInjurySeverity(player, prevInjuryDays) {
  if ((player.injuryDays || 0) > 0 && (prevInjuryDays || 0) <= 0) {
    applyInjuryToPlayer(player);
  }
}

export function handleRoadmapAction(club, shard, shardClubs, standings, action, payload = {}) {
  const { ctx, gs } = buildRoadmapContext(club, shard, shardClubs, standings);
  switch (action) {
    case "press":
      applyPressChoice(ctx, payload.choiceId);
      break;
    case "conversation":
      resolvePlayerConversation(ctx, Boolean(payload.accept));
      break;
    case "scout_zone":
      assignScoutZone(ctx, payload.zoneId);
      break;
    case "shadow_target":
      addShadowTarget(ctx, {
        position: payload.position || "MF",
        minRating: payload.minRating || 58,
        maxAge: payload.maxAge || 27,
      });
      break;
    case "delegation": {
      const key = payload.key;
      if (key && ctx.delegation) {
        ctx.delegation[key] = ctx.delegation[key] === "auto" ? "manual" : "auto";
      }
      break;
    }
    default:
      throw new Error("action ไม่รู้จัก");
  }
  return persistRoadmapContext(gs, ctx);
}

export function storePendingXg(gs, matchId, xgHome, xgAway) {
  const next = { ...gs };
  next.pendingXg = { matchId, xgHome, xgAway };
  return next;
}

export function consumePendingXg(gs, matchId) {
  const pending = gs.pendingXg;
  if (!pending || pending.matchId !== matchId) return { xgHome: 1.2, xgAway: 1.2, gs };
  const { xgHome, xgAway } = pending;
  const next = { ...gs };
  delete next.pendingXg;
  return { xgHome, xgAway, gs: next };
}
