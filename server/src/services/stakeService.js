/**
 * Stake League — ลีคเดิมพัน real-time
 *
 * - สมัครด้วยเงินสโมสร (entryFee 100M), เพดานมูลค่าทีม 500M (นักเตะที่ลงทะเบียน ≤22 คน + ผจก.)
 * - เลือกการ์ด ผจก. จากกระเป๋า (client ส่ง card มา) มาคุมทีมในลีคนี้โดยเฉพาะ
 * - ครบ 16 ทีม (หรือกดเติมบอท) → สร้างตารางเหย้า-เยือนรอบเดียว 15 นัด แข่งทุก ๆ roundMinutes นาที (real-time)
 * - จบลีค: แบ่งเงินรางวัล 1,600M แบบ top-heavy (ที่ 1 ได้ 800M)
 */
import {
  getBestXI,
  simulateInstant,
  applyMatchWear,
  buildSeasonFixtures,
  genSquad,
  genManager,
  uid,
  rand,
} from "@siam/game-engine";
import { prisma } from "../db.js";

export const STAKE_ENTRY_FEE = 100_000_000;
export const STAKE_VALUE_CAP = 500_000_000;
export const STAKE_MAX_TEAMS = 16;
export const STAKE_ROUND_MINUTES = 10;
export const STAKE_MAX_SQUAD = 22;
export const STAKE_MANAGER_VALUE_PER_STAR = 15_000_000;

// top-heavy split of the 1600M pool (per user request: #1 gets a big jackpot)
// 800, 250, 150, 100, 60 | then 40 → 8 declining for ranks 6-16. Sum = 1600.
const PRIZE_TABLE_M = [800, 250, 150, 100, 60, 40, 35, 30, 25, 22, 20, 18, 16, 14, 12, 8];

function parseJson(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export function stakePrizeForPos(pos, prizePool) {
  const frac = (PRIZE_TABLE_M[pos - 1] || 0) / 1600;
  return Math.round(prizePool * frac);
}

function managerCardValue(card) {
  return (card?.stars || 0) * STAKE_MANAGER_VALUE_PER_STAR;
}

/* การ์ด ผจก. จาก client → manager object ที่ engine ใช้ได้ */
function managerFromCard(card) {
  if (!card) return genManager();
  const s = card.stats || {};
  return {
    id: card.cardId || card.id || uid("mg"),
    name: card.name || "ผจก.การ์ด",
    stats: {
      development: s.development ?? 50,
      tactics: s.tactics ?? 50,
      manManagement: s.manManagement ?? 50,
      negotiation: s.negotiation ?? 50,
      scouting: s.scouting ?? 50,
      reputation: s.reputation ?? 50,
    },
    preferredFormation: card.preferredFormation || "4-4-2",
    cardStars: card.stars || 0,
    wins: 0, draws: 0, losses: 0, xp: 0, level: 1,
  };
}

function entryStanding(e) {
  return {
    entryId: e.id, name: e.name, shortCode: e.shortCode, primaryColor: e.primaryColor,
    isBot: e.isBot, userId: e.userId,
    played: e.played, w: e.w, d: e.d, l: e.l, gf: e.gf, ga: e.ga, gd: e.gf - e.ga, pts: e.pts,
    prize: e.prize, finalPos: e.finalPos, squadValue: e.squadValue, autoMode: e.autoMode,
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

/* ---------- status ---------- */

export async function getStakeStatus(userId) {
  // ลีคล่าสุดที่ user มี entry อยู่
  const myEntry = await prisma.stakeEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { league: { include: { entries: true } } },
  });

  // ลีคเปิดรับสมัครอยู่ (สำหรับคนยังไม่สมัคร)
  const openLeague = await prisma.stakeLeague.findFirst({
    where: { status: "recruiting" },
    include: { entries: true },
    orderBy: { createdAt: "desc" },
  });

  let my = null;
  if (myEntry) {
    const lg = myEntry.league;
    const standings = sortEntries(lg.entries).map((e, i) => ({ pos: i + 1, ...entryStanding(e) }));
    let nextMatch = null;
    let lastResults = [];
    if (lg.status === "running") {
      const nm = await prisma.stakeMatch.findFirst({
        where: {
          leagueId: lg.id, played: false,
          OR: [{ homeEntryId: myEntry.id }, { awayEntryId: myEntry.id }],
        },
        orderBy: { round: "asc" },
      });
      if (nm) {
        const oppId = nm.homeEntryId === myEntry.id ? nm.awayEntryId : nm.homeEntryId;
        const opp = lg.entries.find((e) => e.id === oppId);
        nextMatch = {
          round: nm.round,
          isHome: nm.homeEntryId === myEntry.id,
          opponent: opp ? { name: opp.name, shortCode: opp.shortCode, pts: opp.pts } : null,
          // นัดของเราจะเริ่มเมื่อรอบของนัดนั้นถึงคิว
          startsAt: lg.nextRoundAt
            ? new Date(new Date(lg.nextRoundAt).getTime() + (nm.round - lg.currentRound) * lg.roundMinutes * 60_000)
            : null,
        };
      }
    }
    if (lg.status !== "recruiting") {
      const played = await prisma.stakeMatch.findMany({
        where: {
          leagueId: lg.id, played: true,
          OR: [{ homeEntryId: myEntry.id }, { awayEntryId: myEntry.id }],
        },
        orderBy: { round: "desc" },
        take: 5,
      });
      const byId = Object.fromEntries(lg.entries.map((e) => [e.id, e]));
      lastResults = played.map((m) => ({
        round: m.round,
        home: byId[m.homeEntryId]?.shortCode, away: byId[m.awayEntryId]?.shortCode,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        isHome: m.homeEntryId === myEntry.id,
      }));
    }
    my = {
      league: {
        id: lg.id, name: lg.name, status: lg.status,
        entryFee: lg.entryFee, valueCap: lg.valueCap, maxTeams: lg.maxTeams,
        roundMinutes: lg.roundMinutes, totalRounds: lg.totalRounds,
        currentRound: lg.currentRound, nextRoundAt: lg.nextRoundAt,
        prizePool: lg.prizePool, entryCount: lg.entries.length,
        startedAt: lg.startedAt, finishedAt: lg.finishedAt,
      },
      entry: {
        id: myEntry.id, name: myEntry.name, formation: myEntry.formation,
        autoMode: myEntry.autoMode, squadValue: myEntry.squadValue,
        manager: parseJson(myEntry.managerJson),
        squad: parseJson(myEntry.squadJson, []),
        lineup: parseJson(myEntry.lineupJson, []),
        pts: myEntry.pts, w: myEntry.w, d: myEntry.d, l: myEntry.l,
        prize: myEntry.prize, finalPos: myEntry.finalPos,
      },
      standings, nextMatch, lastResults,
    };
  }

  return {
    my,
    open: openLeague
      ? {
          id: openLeague.id, name: openLeague.name,
          entryFee: openLeague.entryFee, valueCap: openLeague.valueCap,
          maxTeams: openLeague.maxTeams, roundMinutes: openLeague.roundMinutes,
          totalRounds: openLeague.totalRounds,
          entryCount: openLeague.entries.length,
          entries: openLeague.entries.map((e) => ({ name: e.name, shortCode: e.shortCode, isBot: e.isBot })),
        }
      : null,
    config: {
      entryFee: STAKE_ENTRY_FEE, valueCap: STAKE_VALUE_CAP, maxTeams: STAKE_MAX_TEAMS,
      roundMinutes: STAKE_ROUND_MINUTES, maxSquad: STAKE_MAX_SQUAD,
      managerValuePerStar: STAKE_MANAGER_VALUE_PER_STAR,
      prizeTable: PRIZE_TABLE_M.map((m) => m * 1_000_000),
    },
  };
}

/* ---------- join ---------- */

export async function joinStakeLeague(userId, { playerIds, managerCard, formation }) {
  const club = await prisma.club.findFirst({ where: { userId }, include: { players: true } });
  if (!club) throw new Error("ต้องมีสโมสรออนไลน์ก่อน");

  // ห้ามมี entry ค้างในลีคที่ยังไม่จบ
  const active = await prisma.stakeEntry.findFirst({
    where: { userId, league: { status: { in: ["recruiting", "running"] } } },
  });
  if (active) throw new Error("คุณอยู่ในลีคเดิมพันที่ยังไม่จบอยู่แล้ว");

  if (!Array.isArray(playerIds) || playerIds.length < 11) throw new Error("ต้องลงทะเบียนนักเตะอย่างน้อย 11 คน");
  if (playerIds.length > STAKE_MAX_SQUAD) throw new Error(`ลงทะเบียนได้สูงสุด ${STAKE_MAX_SQUAD} คน`);

  const chosen = club.players.filter((p) => playerIds.includes(p.id));
  if (chosen.length !== playerIds.length) throw new Error("มีนักเตะที่ไม่ใช่ของสโมสรคุณ");

  const squadValue = chosen.reduce((s, p) => s + (p.value || 0), 0);
  const totalValue = squadValue + managerCardValue(managerCard);
  if (totalValue > STAKE_VALUE_CAP) {
    throw new Error(`มูลค่าทีมรวม ${(totalValue / 1e6).toFixed(1)}M เกินเพดาน ${(STAKE_VALUE_CAP / 1e6).toFixed(0)}M`);
  }
  if (club.budget < STAKE_ENTRY_FEE) throw new Error(`งบไม่พอ ค่าสมัคร ${(STAKE_ENTRY_FEE / 1e6).toFixed(0)}M`);

  // หา/สร้างลีคที่เปิดรับ
  let league = await prisma.stakeLeague.findFirst({
    where: { status: "recruiting" },
    include: { entries: true },
    orderBy: { createdAt: "desc" },
  });
  if (!league) {
    league = await prisma.stakeLeague.create({
      data: {
        name: "Stake League", entryFee: STAKE_ENTRY_FEE, valueCap: STAKE_VALUE_CAP,
        maxTeams: STAKE_MAX_TEAMS, roundMinutes: STAKE_ROUND_MINUTES, totalRounds: STAKE_MAX_TEAMS - 1,
      },
      include: { entries: true },
    });
  }
  if (league.entries.length >= league.maxTeams) throw new Error("ลีคเต็มแล้ว รอลีคถัดไป");

  const manager = managerFromCard(managerCard);
  const squadSnapshot = chosen.map((p) => ({
    ...p, attrs: parseJson(p.attrs, {}), teamId: club.id,
  }));

  const [, entry] = await prisma.$transaction([
    prisma.club.update({ where: { id: club.id }, data: { budget: club.budget - league.entryFee } }),
    prisma.stakeEntry.create({
      data: {
        leagueId: league.id, clubId: club.id, userId,
        name: club.name, shortCode: club.shortCode, primaryColor: club.primaryColor,
        isBot: false,
        managerJson: JSON.stringify(manager),
        squadJson: JSON.stringify(squadSnapshot),
        formation: formation || club.formation || "4-4-2",
        autoMode: true,
        squadValue: totalValue,
      },
    }),
    prisma.stakeLeague.update({
      where: { id: league.id },
      data: { prizePool: { increment: league.entryFee } },
    }),
  ]);

  // ครบ 16 ทีม → เริ่มอัตโนมัติ
  const count = await prisma.stakeEntry.count({ where: { leagueId: league.id } });
  if (count >= league.maxTeams) await startStakeLeague(league.id);

  return { joined: true, entryId: entry.id, leagueId: league.id, entryCount: count };
}

/* ---------- fill with bots & start early ---------- */

export async function fillBotsAndStart(userId) {
  const league = await prisma.stakeLeague.findFirst({
    where: { status: "recruiting", entries: { some: { userId } } },
    include: { entries: true },
  });
  if (!league) throw new Error("คุณยังไม่ได้สมัครลีคที่เปิดรับอยู่");

  const need = league.maxTeams - league.entries.length;
  const botDefs = [
    ["Iron Buffalo", "IBF", "#8a3324"], ["Golden Cobra", "GCB", "#d4af37"],
    ["Storm Riders", "STR", "#5a9bd5"], ["Night Panthers", "NPT", "#3d3d5c"],
    ["Red Falcons", "RFC", "#c1440e"], ["Jade Dragons", "JDR", "#2e8b57"],
    ["Thunder Kings", "TDK", "#e0a458"], ["Silver Wolves", "SWV", "#a9bdb1"],
    ["Crimson Tigers", "CTG", "#b22222"], ["Ocean Sharks", "OSH", "#4682b4"],
    ["Desert Hawks", "DHK", "#c19a6b"], ["Emerald Lions", "ELN", "#50c878"],
    ["Shadow Foxes", "SFX", "#555577"], ["Royal Elephants", "REL", "#7851a9"],
    ["Blaze United", "BLZ", "#ff6347"],
  ];
  const creates = [];
  for (let i = 0; i < need; i++) {
    const [name, short, color] = botDefs[i % botDefs.length];
    const botId = uid("stb");
    const squad = genSquad(botId, rand(10, 16));
    const squadValue = squad.reduce((s, p) => s + (p.value || 0), 0);
    creates.push(prisma.stakeEntry.create({
      data: {
        leagueId: league.id, clubId: null, userId: null,
        name, shortCode: short, primaryColor: color, isBot: true,
        managerJson: JSON.stringify(genManager()),
        squadJson: JSON.stringify(squad),
        formation: ["4-4-2", "4-3-3", "3-5-2", "5-3-2"][rand(0, 3)],
        autoMode: true, squadValue,
      },
    }));
  }
  // บอทจ่ายค่าสมัครเข้ากองกลางด้วย (เงินบ้าน) เพื่อให้เงินรางวัลเต็ม 1,600M
  creates.push(prisma.stakeLeague.update({
    where: { id: league.id },
    data: { prizePool: { increment: league.entryFee * need } },
  }));
  await prisma.$transaction(creates);
  await startStakeLeague(league.id);
  return { started: true, botsAdded: need };
}

/* ---------- start ---------- */

async function startStakeLeague(leagueId) {
  const league = await prisma.stakeLeague.findUnique({
    where: { id: leagueId },
    include: { entries: true },
  });
  if (!league || league.status !== "recruiting") return;

  const fixtures = buildSeasonFixtures(league.entries.map((e) => e.id));
  await prisma.$transaction([
    prisma.stakeMatch.createMany({
      data: fixtures.flatMap((round) =>
        round.matches.map((m) => ({
          leagueId, round: round.day,
          homeEntryId: m.homeClubId, awayEntryId: m.awayClubId,
        })),
      ),
    }),
    prisma.stakeLeague.update({
      where: { id: leagueId },
      data: {
        status: "running",
        currentRound: 1,
        totalRounds: fixtures.length,
        startedAt: new Date(),
        // รอบแรกเริ่มหลังจากนี้ roundMinutes นาที → ผู้เล่นมีเวลาจัดทีมตามสเปค "จะเริ่มใน 10 นาที"
        nextRoundAt: new Date(Date.now() + league.roundMinutes * 60_000),
      },
    }),
  ]);
}

/* ---------- lineup / tactics ---------- */

export async function setStakeLineup(userId, { lineup, formation, autoMode }) {
  const entry = await prisma.stakeEntry.findFirst({
    where: { userId, league: { status: { in: ["recruiting", "running"] } } },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) throw new Error("ไม่พบทีมของคุณในลีคเดิมพันที่กำลังดำเนินอยู่");

  const data = {};
  if (typeof autoMode === "boolean") data.autoMode = autoMode;
  if (formation) data.formation = formation;
  if (Array.isArray(lineup)) {
    const squad = parseJson(entry.squadJson, []);
    const validIds = new Set(squad.map((p) => p.id));
    const clean = lineup.filter((id) => validIds.has(id)).slice(0, 11);
    data.lineupJson = JSON.stringify(clean);
  }
  await prisma.stakeEntry.update({ where: { id: entry.id }, data });
  return { ok: true };
}

/* ---------- tick: แข่งตามเวลาจริง ---------- */

function resolveXI(entry, squad) {
  const lineup = parseJson(entry.lineupJson, []);
  const validIds = new Set(squad.map((p) => p.id));
  let xi = (entry.autoMode ? [] : lineup).filter((id) => validIds.has(id));
  if (xi.length < 11) xi = getBestXI(squad, entry.formation);
  return xi.slice(0, 11);
}

export async function runStakeTick() {
  const now = new Date();
  const leagues = await prisma.stakeLeague.findMany({
    where: { status: "running", nextRoundAt: { lte: now } },
    include: { entries: true },
  });
  const results = [];
  for (const league of leagues) {
    results.push(await resolveStakeRound(league));
  }
  return results;
}

async function resolveStakeRound(league) {
  const round = league.currentRound;
  const matches = await prisma.stakeMatch.findMany({
    where: { leagueId: league.id, round, played: false },
  });
  const entriesById = Object.fromEntries(league.entries.map((e) => [e.id, e]));
  const squadCache = {};
  const getSquad = (e) => (squadCache[e.id] ??= parseJson(e.squadJson, []));

  const tx = [];
  for (const m of matches) {
    const home = entriesById[m.homeEntryId];
    const away = entriesById[m.awayEntryId];
    if (!home || !away) continue;
    const homeSquad = getSquad(home);
    const awaySquad = getSquad(away);
    const homeXI = resolveXI(home, homeSquad);
    const awayXI = resolveXI(away, awaySquad);
    const homeTeam = { formation: home.formation, manager: parseJson(home.managerJson), tier: 0 };
    const awayTeam = { formation: away.formation, manager: parseJson(away.managerJson), tier: 0 };
    const { homeGoals, awayGoals } = simulateInstant(
      homeTeam, homeSquad, homeXI, awayTeam, awaySquad, awayXI, 50, 50,
    );

    applyMatchWear(homeSquad, homeXI);
    applyMatchWear(awaySquad, awayXI);

    tx.push(prisma.stakeMatch.update({
      where: { id: m.id },
      data: { played: true, homeGoals, awayGoals },
    }));
    const homeRes = homeGoals > awayGoals ? "w" : homeGoals < awayGoals ? "l" : "d";
    const awayRes = homeRes === "w" ? "l" : homeRes === "l" ? "w" : "d";
    tx.push(prisma.stakeEntry.update({
      where: { id: home.id },
      data: {
        played: { increment: 1 }, gf: { increment: homeGoals }, ga: { increment: awayGoals },
        [homeRes]: { increment: 1 }, pts: { increment: homeRes === "w" ? 3 : homeRes === "d" ? 1 : 0 },
      },
    }));
    tx.push(prisma.stakeEntry.update({
      where: { id: away.id },
      data: {
        played: { increment: 1 }, gf: { increment: awayGoals }, ga: { increment: homeGoals },
        [awayRes]: { increment: 1 }, pts: { increment: awayRes === "w" ? 3 : awayRes === "d" ? 1 : 0 },
      },
    }));
  }

  // ฟื้นสตามินาเล็กน้อยระหว่างรอบ (รอบละ 10 นาทีจริง) + persist squad snapshot
  for (const e of league.entries) {
    const squad = squadCache[e.id];
    if (!squad) continue;
    squad.forEach((p) => {
      p.stamina = Math.min(100, (p.stamina || 100) + 8);
      if (p.injuryDays > 0) p.injuryDays -= 1;
    });
    tx.push(prisma.stakeEntry.update({
      where: { id: e.id },
      data: { squadJson: JSON.stringify(squad) },
    }));
  }

  const isLastRound = round >= league.totalRounds;
  tx.push(prisma.stakeLeague.update({
    where: { id: league.id },
    data: isLastRound
      ? { currentRound: round, nextRoundAt: null }
      : { currentRound: round + 1, nextRoundAt: new Date(Date.now() + league.roundMinutes * 60_000) },
  }));
  await prisma.$transaction(tx);

  if (isLastRound) await finishStakeLeague(league.id);
  return { leagueId: league.id, round, matches: matches.length, finished: isLastRound };
}

/* ---------- finish & payout ---------- */

async function finishStakeLeague(leagueId) {
  const league = await prisma.stakeLeague.findUnique({
    where: { id: leagueId },
    include: { entries: true },
  });
  if (!league || league.status === "finished") return;

  const sorted = sortEntries(league.entries);
  const tx = [];
  sorted.forEach((e, i) => {
    const pos = i + 1;
    const prize = stakePrizeForPos(pos, league.prizePool);
    tx.push(prisma.stakeEntry.update({
      where: { id: e.id },
      data: { finalPos: pos, prize },
    }));
    // จ่ายเงินรางวัลเข้างบสโมสรจริง (เฉพาะทีมผู้เล่น)
    if (!e.isBot && e.clubId && prize > 0) {
      tx.push(prisma.club.update({
        where: { id: e.clubId },
        data: { budget: { increment: prize } },
      }));
    }
  });
  tx.push(prisma.stakeLeague.update({
    where: { id: leagueId },
    data: { status: "finished", finishedAt: new Date() },
  }));
  await prisma.$transaction(tx);
}
