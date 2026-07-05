import {
  TEAMS_PER_SHARD,
  getBestXI,
  simulateInstant,
  applyMatchWear,
  recoverStaminaAll,
  buildSeasonFixtures,
  isSeasonComplete,
  createBotOnlyShard,
  genManager,
  genSquad,
} from "@siam/game-engine";
import { prisma } from "../db.js";
import { reclaimInactiveLegends } from "./legendService.js";
import { kickOffRoundMatches, finalizeFinishedMatches } from "./liveMatchService.js";
import { DAILY_STAFF_CARD_DRAWS, MS_PER_GAME_DAY, isMatchWindowOpen, isMarketWindowOpen } from "../../../game-version.js";
import {
  initRoadmapForNewClub,
  getRoadmapPayload,
  applyOnlineMatchRoadmap,
  applyOnlineDailyRoadmap,
  applyOnlineSeasonEndRoadmap,
  patchOnlineInjurySeverity,
  storePendingXg,
  consumePendingXg,
  handleRoadmapAction,
} from "./roadmapService.js";

/** กัน day-tick ถี่เกิน (in-process + cron backup ใช้ร่วมกัน) */
const lastShardDayTick = new Map();

/** อีกกี่ ms กว่าจะถึงคิวคิกอฟรอบถัดไปของชาร์ดนี้ — ใช้ทำแบนเนอร์เตือนก่อนแมทฝั่ง client (null = ไม่มีรอบรออยู่/นอกช่วงแข่งขัน) */
export function getShardNextKickoffEtaMs(shardId) {
  if (!isMatchWindowOpen()) return null;
  const last = lastShardDayTick.get(shardId);
  if (last == null) return 0; // ยังไม่เคยคิกอฟเลย — รอบแรกพร้อมคิกอฟทันทีที่ day-tick ถัดไปมาถึง
  return Math.max(0, MS_PER_GAME_DAY - (Date.now() - last));
}

function calendarDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseGameState(json) {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/** รีเซ็ตสิทธิ์เปิดการ์ดรายวัน (100 ครั้ง/วันตามปฏิทินจริง) */
export function syncDailyStaffDraws(gameState) {
  const gs = { ...gameState };
  const today = calendarDayKey();
  if (gs.staffFreeDrawResetDate !== today) {
    gs.staffFreeDrawsLeft = DAILY_STAFF_CARD_DRAWS;
    gs.staffFreeDrawResetDate = today;
  }
  if (gs.staffFreeDrawsLeft == null) gs.staffFreeDrawsLeft = DAILY_STAFF_CARD_DRAWS;
  if (gs.staffDrawTickets == null) gs.staffDrawTickets = 0;
  return gs;
}

function parseManager(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function clubToEngine(club) {
  return {
    id: club.id,
    formation: club.formation,
    chemistry: club.chemistry,
    manager: parseManager(club.managerJson),
    tier: club.tier,
  };
}

function playerToEngine(p) {
  return {
    ...p,
    clubId: p.clubId,
    attrs: JSON.parse(p.attrs),
    teamId: p.clubId,
  };
}

async function persistPlayers(players) {
  for (const p of players) {
    await prisma.player.update({
      where: { id: p.id },
      data: {
        stamina: p.stamina,
        injuryDays: p.injuryDays,
        careerApps: p.careerApps,
        morale: p.morale,
        attrs: JSON.stringify(p.attrs),
        attack: p.attack,
        defense: p.defense,
        rating: p.rating,
      },
    });
  }
}

export function computeClubFinances(club, players) {
  const squadValue = players.reduce((s, p) => s + (p.value || 0), 0);
  const budget = club.budget || 0;
  const teamValue = squadValue + budget;
  return { squadValue, budget, teamValue, unlockTarget: 50_000_000 };
}

async function loadShardStandings(shardId) {
  return prisma.standing.findMany({
    where: { club: { shardId } },
    include: { club: { select: { id: true, userId: true, isBot: true } } },
  });
}

async function loadShardMeta(shardId) {
  const [shard, clubs, standings] = await Promise.all([
    prisma.leagueShard.findUnique({ where: { id: shardId } }),
    prisma.club.findMany({ where: { shardId } }),
    loadShardStandings(shardId),
  ]);
  return { shard, clubs, standings };
}

export async function getClubForUser(userId) {
  const club = await prisma.club.findFirst({
    where: { userId },
    include: {
      shard: true,
      standing: true,
      players: true,
    },
  });
  if (!club) return null;

  let gs = syncDailyStaffDraws(parseGameState(club.gameStateJson));
  const prevJson = club.gameStateJson || "{}";
  const { shard, clubs, standings } = await loadShardMeta(club.shardId);
  if (!gs.roadmap?.roadmapV12) {
    gs = initRoadmapForNewClub(club, shard, clubs);
  }
  const nextJson = JSON.stringify(gs);
  if (nextJson !== prevJson) {
    await prisma.club.update({
      where: { id: club.id },
      data: { gameStateJson: nextJson },
    });
  }

  const finances = computeClubFinances(club, club.players);
  const lineup = club.lineupJson ? JSON.parse(club.lineupJson) : [];
  const roadmap = getRoadmapPayload({ ...club, gameStateJson: nextJson }, shard, clubs, standings);
  return {
    ...club,
    lineup,
    finances,
    roadmap,
    staffDraws: {
      freeLeft: gs.staffFreeDrawsLeft,
      dailyLimit: DAILY_STAFF_CARD_DRAWS,
      tickets: gs.staffDrawTickets,
      resetDate: gs.staffFreeDrawResetDate,
    },
  };
}

export async function updateClubTactics(userId, { formation, lineup, autoMode, gameState }) {
  const club = await prisma.club.findFirst({ where: { userId } });
  if (!club) throw new Error("ไม่พบสโมสร");
  const data = {};
  if (formation) data.formation = formation;
  if (typeof autoMode === "boolean") data.autoMode = autoMode;
  if (Array.isArray(lineup)) data.lineupJson = JSON.stringify(lineup.slice(0, 11));
  if (gameState != null) data.gameStateJson = JSON.stringify(gameState);
  return prisma.club.update({
    where: { id: club.id },
    data,
    include: { shard: true, standing: true, players: true },
  }).then((c) => ({ ...c, lineup: c.lineupJson ? JSON.parse(c.lineupJson) : [] }));
}

function playerCreateData(p) {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    age: p.age,
    attrs: JSON.stringify(p.attrs),
    attack: p.attack,
    defense: p.defense,
    rating: p.rating,
    potential: p.potential,
    value: p.value,
    wage: p.wage,
    morale: p.morale,
    stamina: p.stamina,
    injuryDays: p.injuryDays,
    careerGoals: p.careerGoals,
    careerApps: p.careerApps,
    role: p.role,
    contractEndsDay: p.contractEndsDay,
  };
}

/** เปิดชาร์ดบอทล้วนใหม่ (16 ทีม) ไว้เป็น "แชนแนล" รอผู้เล่นจริงมาแทนที่บอททีละคน */
async function createBotOnlyShardInDb() {
  const world = createBotOnlyShard();
  await prisma.leagueShard.create({
    data: {
      id: world.shard.id,
      name: world.shard.name,
      division: world.shard.division,
      seasonNumber: world.shard.seasonNumber,
      dayNumber: world.shard.dayNumber,
      isFull: false,
      clubs: {
        create: world.clubs.map((c) => ({
          id: c.id,
          userId: null,
          name: c.name,
          shortCode: c.shortCode,
          logoIndex: c.logoIndex,
          primaryColor: c.primaryColor,
          secondaryColor: c.secondaryColor,
          budget: c.budget,
          tier: c.tier,
          formation: c.formation,
          chemistry: c.chemistry,
          isBot: true,
          managerJson: JSON.stringify(c.manager),
          gameStateJson: JSON.stringify(syncDailyStaffDraws({})),
          players: { create: c.players.map(playerCreateData) },
          standing: { create: { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 } },
        })),
      },
      matches: {
        create: world.fixtures.flatMap((round) =>
          round.matches.map((m) => ({
            dayNumber: round.day,
            homeClubId: m.homeClubId,
            awayClubId: m.awayClubId,
          })),
        ),
      },
    },
  });
  return world.shard.id;
}

/** ผู้เล่นจริงเข้ามาแทนที่ทีมบอทตัวหนึ่งในชาร์ดที่มีอยู่ — ทุกคนแชร์ลีค 16 ทีมเดียวกันจริง
 * (เดิม: ทุกคนได้ชาร์ดบอทส่วนตัวของตัวเอง ไม่มีใครแชร์ลีคกับใครเลย — เป็นช่องว่างที่ขัดกับดีไซน์เดิม) */
export async function createClubForUser(userId, config) {
  // เปิดรับสมาชิกใหม่เฉพาะช่วงพักฟื้น/ตลาด 20:00-09:00 — ให้ทุกคนเริ่มจากตารางคะแนน 0-0-0-0 ที่เพิ่งรีเซ็ต
  // ไม่ใช่รับช่วงสถิติค้างของบอทที่แข่งไปแล้วบางส่วนระหว่างวัน (ดู HANDOFF/บันทึกการคุยออกแบบ)
  if (!isMarketWindowOpen()) {
    throw new Error("ลีคออนไลน์เปิดรับสมาชิกใหม่เฉพาะช่วง 20:00-09:00 น. (ตอนนี้กำลังแข่งขันอยู่) กลับมาใหม่หลัง 20:00 น. หรือเล่นโหมด Sandbox ระหว่างรอ");
  }

  const existing = await prisma.club.findFirst({ where: { userId } });
  if (existing) throw new Error("มีสโมสรแล้ว");

  let openBotClub = await prisma.club.findFirst({
    where: { isBot: true, userId: null, shard: { isFull: false } },
  });

  let shardId;
  if (openBotClub) {
    shardId = openBotClub.shardId;
  } else {
    shardId = await createBotOnlyShardInDb();
    openBotClub = await prisma.club.findFirst({ where: { shardId, isBot: true, userId: null } });
  }

  const manager = genManager();
  const players = genSquad(openBotClub.id, -3);

  await prisma.$transaction([
    prisma.player.deleteMany({ where: { clubId: openBotClub.id } }),
    prisma.club.update({
      where: { id: openBotClub.id },
      data: {
        userId,
        name: config.name,
        shortCode: config.short,
        logoIndex: config.logoIndex ?? 0,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor ?? "#f2f0e6",
        shirtColor: config.shirtColor ?? null,
        shortsColor: config.shortsColor ?? null,
        budget: 500_000_000,
        tier: -3,
        formation: "4-4-2",
        chemistry: 50,
        isBot: false,
        managerJson: JSON.stringify(manager),
        gameStateJson: JSON.stringify(syncDailyStaffDraws({})),
        players: { create: players.map(playerCreateData) },
      },
    }),
  ]);

  const remainingBotSlots = await prisma.club.count({ where: { shardId, isBot: true, userId: null } });
  if (remainingBotSlots === 0) {
    await prisma.leagueShard.update({ where: { id: shardId }, data: { isFull: true } });
  }

  return prisma.club.findFirst({
    where: { userId },
    include: { shard: true, standing: true, players: true },
  }).then(async (club) => {
    if (!club) return null;
    const { shard, clubs, standings } = await loadShardMeta(club.shardId);
    const gs = initRoadmapForNewClub(club, shard, clubs);
    await prisma.club.update({
      where: { id: club.id },
      data: { gameStateJson: JSON.stringify(syncDailyStaffDraws(gs)) },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { onlineUnlocked: true, playMode: "online", onlineUnlockedAt: new Date() },
    });
    return { ...club, finances: computeClubFinances(club, club.players) };
  });
}

export async function getLeagueTable(shardId, viewerUserId) {
  const standings = await prisma.standing.findMany({
    where: { club: { shardId } },
    include: { club: true },
    orderBy: [{ pts: "desc" }, { gf: "desc" }],
  });
  return standings.map((s) => ({
    ...s,
    gd: s.gf - s.ga,
    club: {
      id: s.club.id,
      name: s.club.name,
      shortCode: s.club.shortCode,
      primaryColor: s.club.primaryColor,
      isBot: s.club.isBot,
      // ไม่ส่ง userId ดิบออกไป (เป็น credential ที่ปลอมโทเคนได้) — ส่งเฉพาะ flag ว่าเป็นแถวของผู้ดูเองหรือไม่
      isYou: Boolean(viewerUserId) && s.club.userId === viewerUserId,
    },
  }));
}

/** รายชื่อนักเตะทุกทีมในชาร์ด (ยกเว้นทีมตัวเอง) — สำหรับหน้าตลาด/เสนอซื้อตรง */
export async function getShardRoster(shardId, viewerClubId) {
  const clubs = await prisma.club.findMany({
    where: { shardId, id: { not: viewerClubId } },
    include: { players: { where: { isLegend: false } } },
    orderBy: { name: "asc" },
  });
  return clubs.map((c) => ({
    id: c.id,
    name: c.name,
    shortCode: c.shortCode,
    primaryColor: c.primaryColor,
    isBot: c.isBot,
    players: c.players.map((p) => ({
      id: p.id, name: p.name, position: p.position, age: p.age,
      rating: p.rating, potential: p.potential, value: p.value, wage: p.wage,
    })),
  }));
}

export async function getTodayMatches(shardId, dayNumber) {
  return prisma.match.findMany({
    where: { shardId, dayNumber },
    include: {
      homeClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, userId: true, isBot: true } },
      awayClub: { select: { id: true, name: true, shortCode: true, primaryColor: true, userId: true, isBot: true } },
    },
  });
}

function matchHasHuman(match, clubsById) {
  const home = clubsById[match.homeClubId];
  const away = clubsById[match.awayClubId];
  return Boolean(home && away && (!home.isBot || !away.isBot));
}

async function loadShardContext(shardId) {
  const clubs = await prisma.club.findMany({
    where: { shardId },
    include: { players: true, standing: true },
  });
  const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
  const allPlayers = clubs.flatMap((c) => c.players.map(playerToEngine));
  return { clubs, clubsById, allPlayers };
}

async function simulateAndPersistMatch(match, clubsById, allPlayers, { homeXI, awayXI, homeGoals, awayGoals }) {
  const homeClub = clubsById[match.homeClubId];
  const awayClub = clubsById[match.awayClubId];
  const homeSquad = allPlayers.filter((p) => p.clubId === match.homeClubId);
  const awaySquad = allPlayers.filter((p) => p.clubId === match.awayClubId);
  const hXI = homeXI || getBestXI(homeSquad, homeClub.formation);
  const aXI = awayXI || getBestXI(awaySquad, awayClub.formation);
  let hg = homeGoals;
  let ag = awayGoals;
  if (hg == null || ag == null) {
    ({ homeGoals: hg, awayGoals: ag } = simulateInstant(
      clubToEngine(homeClub), homeSquad, hXI,
      clubToEngine(awayClub), awaySquad, aXI,
      homeClub.chemistry, awayClub.chemistry,
    ));
  }

  await prisma.match.update({
    where: { id: match.id },
    data: { played: true, homeGoals: hg, awayGoals: ag },
  });
  await prisma.standing.update({
    where: { id: homeClub.standing.id },
    data: applyStandingResult(homeClub.standing, hg, ag),
  });
  await prisma.standing.update({
    where: { id: awayClub.standing.id },
    data: applyStandingResult(awayClub.standing, ag, hg),
  });
  homeClub.standing = { ...homeClub.standing, ...applyStandingResult(homeClub.standing, hg, ag) };
  awayClub.standing = { ...awayClub.standing, ...applyStandingResult(awayClub.standing, ag, hg) };
  applyMatchWear(homeSquad, hXI);
  applyMatchWear(awaySquad, aXI);
  return { homeGoals: hg, awayGoals: ag, homeXI: hXI, awayXI: aXI };
}

async function runRoadmapForHumanClubs(shardId, fn) {
  const { shard, clubs, standings } = await loadShardMeta(shardId);
  for (const c of clubs.filter((cl) => !cl.isBot && cl.userId)) {
    const gs = fn(c, shard, clubs, standings);
    if (gs) {
      await prisma.club.update({
        where: { id: c.id },
        data: { gameStateJson: JSON.stringify(syncDailyStaffDraws(gs)) },
      });
    }
  }
}

/** จำลองเฉพาะแมตช์บอท vs บอท ของวันนั้น */
export async function simBotOnlyMatchesOnDay(shardId, dayNumber) {
  const { clubsById, allPlayers } = await loadShardContext(shardId);
  const matches = await prisma.match.findMany({
    where: { shardId, dayNumber, played: false },
  });
  let simmed = 0;
  for (const match of matches) {
    if (matchHasHuman(match, clubsById)) continue;
    await simulateAndPersistMatch(match, clubsById, allPlayers, {});
    simmed += 1;
  }
  if (simmed) await persistPlayers(allPlayers);
  return simmed;
}

async function tryCompleteShardDay(shardId, dayNumber) {
  const remaining = await prisma.match.count({
    where: { shardId, dayNumber, played: false },
  });
  if (remaining > 0) return { advanced: false, remaining };

  const { allPlayers } = await loadShardContext(shardId);
  recoverStaminaAll(allPlayers);
  await persistPlayers(allPlayers);

  await runRoadmapForHumanClubs(shardId, (club, shard, clubs, standings) =>
    applyOnlineDailyRoadmap(club, shard, clubs, standings),
  );

  const shard = await prisma.leagueShard.findUnique({ where: { id: shardId } });
  if (isSeasonComplete(shard.dayNumber)) {
    await startNewSeason(shardId);
    return { advanced: true, action: "new_season" };
  }
  await prisma.leagueShard.update({
    where: { id: shardId },
    data: { dayNumber: shard.dayNumber + 1 },
  });
  return { advanced: true, action: "advanced_day", day: shard.dayNumber + 1 };
}

function serializePlayerForClient(p) {
  return {
    ...p,
    attrs: typeof p.attrs === "string" ? JSON.parse(p.attrs) : p.attrs,
    teamId: p.clubId,
  };
}

function serializeClubForLive(club) {
  const lineup = club.lineupJson ? JSON.parse(club.lineupJson) : [];
  return {
    id: club.id,
    name: club.name,
    short: club.shortCode,
    shortCode: club.shortCode,
    color: club.primaryColor,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    shirtColor: club.shirtColor || club.primaryColor,
    shortsColor: club.shortsColor || "#0b2318",
    formation: club.formation,
    chemistry: club.chemistry,
    autoMode: club.autoMode,
    isBot: club.isBot,
    manager: parseManager(club.managerJson),
    lineup,
    players: club.players.map(serializePlayerForClient),
  };
}

export async function getUserMatchToday(userId) {
  const club = await getClubForUser(userId);
  if (!club) return null;
  const day = club.shard.dayNumber;
  const matches = await prisma.match.findMany({
    where: {
      shardId: club.shardId,
      dayNumber: day,
      OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
    },
    include: {
      homeClub: { include: { players: true } },
      awayClub: { include: { players: true } },
    },
  });
  const match = matches.find((m) => !m.played) || matches[0] || null;
  if (!match) return { club, day, season: club.shard.seasonNumber, match: null, played: true };
  return {
    club,
    day,
    season: club.shard.seasonNumber,
    match,
    played: match.played,
    isHome: match.homeClubId === club.id,
  };
}

function resolveLockedXI(club, players) {
  const lineup = club.lineupJson ? JSON.parse(club.lineupJson) : [];
  return lineup.length ? lineup.slice(0, 11) : getBestXI(players, club.formation);
}

/** ก่อนแมตช์สด — จำลองบอทที่เหลือในวันนี้ แล้วคืนข้อมูลแมตช์ของผู้เล่น */
export async function prepareUserLiveMatch(userId) {
  if (!isMatchWindowOpen()) throw new Error("นอกช่วงเวลาแข่งขัน (9:00-20:00 น.) — ตอนนี้เป็นช่วงพักฟื้น/ตลาด");
  const club = await getClubForUser(userId);
  if (!club) throw new Error("ไม่พบสโมสร");
  await simBotOnlyMatchesOnDay(club.shardId, club.shard.dayNumber);

  const state = await getUserMatchToday(userId);
  if (!state?.match) throw new Error("ไม่มีแมตช์วันนี้");
  if (state.match.played) throw new Error("แมตช์วันนี้จบแล้ว — รอ cron ขึ้นวันถัดไป");

  const homeClub = state.match.homeClub;
  const awayClub = state.match.awayClub;
  const homePlayers = homeClub.players.map(serializePlayerForClient);
  const awayPlayers = awayClub.players.map(serializePlayerForClient);
  const homeXI = resolveLockedXI(homeClub, homePlayers);
  const awayXI = resolveLockedXI(awayClub, awayPlayers);

  // ตัดสินผลจริง "ตอนนี้เลย" ฝั่งเซิร์ฟเวอร์ แล้วล็อกลงแมตช์ทันที (played ยังเป็น false) — กันบั๊ก/ช่องโหว่
  // เดิมที่ finish รับ homeGoals/awayGoals จาก client แล้วเชื่อตรงๆ (ปลอมสกอร์ชนะได้ทุกนัดจาก devtools)
  // เรียก kickoff ซ้ำ (รีเฟรช/กลับเข้ามาใหม่ก่อนกด finish) จะได้สกอร์เดิมที่ล็อกไว้แล้ว ไม่สุ่มใหม่ทุกครั้ง
  let homeGoals = state.match.homeGoals;
  let awayGoals = state.match.awayGoals;
  if (homeGoals == null || awayGoals == null) {
    const result = simulateInstant(
      clubToEngine(homeClub), homePlayers, homeXI,
      clubToEngine(awayClub), awayPlayers, awayXI,
      homeClub.chemistry, awayClub.chemistry,
    );
    homeGoals = result.homeGoals;
    awayGoals = result.awayGoals;
    await prisma.match.update({
      where: { id: state.match.id },
      data: { homeGoals, awayGoals },
    });
    if (state.isHome || state.match.awayClubId === club.id) {
      let gs = syncDailyStaffDraws(parseGameState(club.gameStateJson));
      gs = storePendingXg(gs, state.match.id, result.xgHome, result.xgAway);
      await prisma.club.update({
        where: { id: club.id },
        data: { gameStateJson: JSON.stringify(gs) },
      });
    }
  }

  return {
    matchId: state.match.id,
    day: state.day,
    season: state.season,
    isHome: state.isHome,
    homeClub: serializeClubForLive({ ...homeClub, lineup: homeXI }),
    awayClub: serializeClubForLive({ ...awayClub, lineup: awayXI }),
    liveMatch: {
      matchId: state.match.id,
      day: state.day,
      home: homeClub.id,
      away: awayClub.id,
      homeFormation: homeClub.formation,
      awayFormation: awayClub.formation,
      homeXI,
      awayXI,
      resultPreview: { homeGoals, awayGoals },
    },
  };
}

/** บันทึกผลแมตช์สด — สกอร์ต้องถูกล็อกไว้แล้วตอน kickoff (prepareUserLiveMatch) เท่านั้น
 * ไม่รับ homeGoals/awayGoals/homeXI/awayXI จาก client อีกต่อไป (เคยเป็นช่องโหว่ปลอมสกอร์) */
export async function finishUserLiveMatch(userId, matchId) {
  const club = await getClubForUser(userId);
  if (!club) throw new Error("ไม่พบสโมสร");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.shardId !== club.shardId) throw new Error("ไม่พบแมตช์");
  if (match.played) throw new Error("แมตช์นี้จบแล้ว");
  if (match.homeClubId !== club.id && match.awayClubId !== club.id) {
    throw new Error("ไม่ใช่แมตช์ของคุณ");
  }
  if (match.homeGoals == null || match.awayGoals == null) {
    throw new Error("แมตช์นี้ยังไม่ได้เริ่ม (ต้องกด kickoff ก่อน)");
  }

  const { clubsById, allPlayers } = await loadShardContext(club.shardId);
  const homeClub = clubsById[match.homeClubId];
  const awayClub = clubsById[match.awayClubId];
  const homeSquad = allPlayers.filter((p) => p.clubId === match.homeClubId);
  const awaySquad = allPlayers.filter((p) => p.clubId === match.awayClubId);
  const homeXI = resolveLockedXI(homeClub, homeSquad);
  const awayXI = resolveLockedXI(awayClub, awaySquad);
  const homeGoals = match.homeGoals;
  const awayGoals = match.awayGoals;

  const prevInjury = new Map(allPlayers.map((p) => [p.id, p.injuryDays || 0]));
  await simulateAndPersistMatch(match, clubsById, allPlayers, { homeXI, awayXI, homeGoals, awayGoals });
  allPlayers.forEach((p) => {
    if (p.clubId === club.id) patchOnlineInjurySeverity(p, prevInjury.get(p.id));
  });
  await persistPlayers(allPlayers);

  let gs = syncDailyStaffDraws(parseGameState(club.gameStateJson));
  const { xgHome, xgAway, gs: gs2 } = consumePendingXg(gs, matchId);
  gs = gs2;
  const { shard, clubs, standings } = await loadShardMeta(club.shardId);
  gs = applyOnlineMatchRoadmap(club, shard, clubs, standings, {
    match, homeGoals, awayGoals, xgHome, xgAway,
  });
  await prisma.club.update({
    where: { id: club.id },
    data: { gameStateJson: JSON.stringify(syncDailyStaffDraws(gs)) },
  });

  const dayResult = await tryCompleteShardDay(club.shardId, match.dayNumber);
  return {
    ok: true,
    score: { homeGoals, awayGoals },
    dayResult,
    roadmap: getRoadmapPayload({ ...club, gameStateJson: JSON.stringify(gs) }, shard, clubs, standings),
  };
}

/**
 * Cron day-tick: เตะอัตโนมัติตามเวลาจริงทุกชาร์ด (บอทและผู้เล่นจริงเหมือนกันหมด ไม่แยกแล้ว)
 * รอบหนึ่ง = คิกอฟทุกแมทของวันนั้นพร้อมกัน (kickOffRoundMatches) → รอ ~6 นาทีจริงให้จบ 90 นาทีเกม
 * (finalizeFinishedMatches) → ครบทุกแมทแล้วค่อยขึ้นวันถัดไป (tryCompleteShardDay)
 */
export async function runDayTickForShard(shardId, { force = false } = {}) {
  // แข่งได้เฉพาะ 9:00-20:00 เวลาไทยเท่านั้น — หลัง 20:00 คือช่วงพักฟื้น/อีเวนต์/ตลาด ห้าม day-tick เดินต่อ
  if (!force && !isMatchWindowOpen()) {
    return { shardId, action: "outside_match_window" };
  }

  const shard = await prisma.leagueShard.findUnique({ where: { id: shardId } });
  if (!shard) return { skipped: true };

  if (isSeasonComplete(shard.dayNumber)) {
    await startNewSeason(shardId);
    return { shardId, action: "new_season" };
  }

  // 1) แมทที่ยังไม่คิกอฟของวันนี้ → เริ่มพร้อมกันทั้งหมด (throttle กันคิกอฟซ้ำด้วย lastShardDayTick)
  const now = Date.now();
  const last = lastShardDayTick.get(shardId) || 0;
  const scheduledCount = await prisma.match.count({
    where: { shardId, dayNumber: shard.dayNumber, status: "scheduled" },
  });
  if (scheduledCount > 0) {
    if (!force && now - last < MS_PER_GAME_DAY) {
      return { shardId, action: "throttled", waitMs: MS_PER_GAME_DAY - (now - last) };
    }
    const { kicked } = await kickOffRoundMatches(shardId, shard.dayNumber);
    lastShardDayTick.set(shardId, Date.now());
    return { shardId, action: "kicked_off", day: shard.dayNumber, kicked };
  }

  // 2) แมทที่กำลังแข่งสดอยู่ (ครบ 90 นาทีเกมหรือยัง) → ปิดจบเฉพาะที่จบแล้ว
  const liveCount = await prisma.match.count({
    where: { shardId, dayNumber: shard.dayNumber, status: "live", played: false },
  });
  if (liveCount > 0) {
    const { finalized } = await finalizeFinishedMatches(shardId, shard.dayNumber);
    const dayResult = await tryCompleteShardDay(shardId, shard.dayNumber);
    return {
      shardId,
      action: dayResult.advanced ? dayResult.action : "waiting_live",
      day: shard.dayNumber,
      finalized,
      remaining: dayResult.remaining,
    };
  }

  // 3) ไม่มีแมท scheduled/live เหลือเลย แต่ยังไม่ครบวัน (เช่น รอบก่อนจบไปแล้วรอ throttle ให้ครบ MS_PER_GAME_DAY)
  const dayResult = await tryCompleteShardDay(shardId, shard.dayNumber);
  return { shardId, action: dayResult.action || "already_clear", day: dayResult.day };
}

function applyStandingResult(standing, gf, ga) {
  const next = { ...standing };
  next.played += 1;
  next.gf += gf;
  next.ga += ga;
  if (gf > ga) { next.w += 1; next.pts += 3; }
  else if (gf < ga) { next.l += 1; }
  else { next.d += 1; next.pts += 1; }
  return {
    played: next.played, w: next.w, d: next.d, l: next.l,
    gf: next.gf, ga: next.ga, pts: next.pts,
  };
}

async function startNewSeason(shardId) {
  const clubs = await prisma.club.findMany({ where: { shardId } });
  const clubIds = clubs.map((c) => c.id);
  const fixtures = buildSeasonFixtures(clubIds);

  await prisma.match.deleteMany({ where: { shardId } });
  await prisma.standing.updateMany({
    where: { clubId: { in: clubIds } },
    data: { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 },
  });
  await prisma.match.createMany({
    data: fixtures.flatMap((round) =>
      round.matches.map((m) => ({
        shardId,
        dayNumber: round.day,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
      })),
    ),
  });

  const shard = await prisma.leagueShard.findUnique({ where: { id: shardId } });
  await runRoadmapForHumanClubs(shardId, (club, sh, clubs, standings) =>
    applyOnlineSeasonEndRoadmap(club, sh, clubs, standings),
  );
  await prisma.leagueShard.update({
    where: { id: shardId },
    data: { seasonNumber: shard.seasonNumber + 1, dayNumber: 1 },
  });
}

export async function patchUserRoadmap(userId, action, payload) {
  const club = await prisma.club.findFirst({
    where: { userId },
    include: { shard: true, players: true, standing: true },
  });
  if (!club) throw new Error("ไม่พบสโมสร");
  const { shard, clubs, standings } = await loadShardMeta(club.shardId);
  const gs = handleRoadmapAction(club, shard, clubs, standings, action, payload);
  await prisma.club.update({
    where: { id: club.id },
    data: { gameStateJson: JSON.stringify(syncDailyStaffDraws(gs)) },
  });
  return getRoadmapPayload({ ...club, gameStateJson: JSON.stringify(gs) }, shard, clubs, standings);
}

export async function runDayTickAll() {
  const shards = await prisma.leagueShard.findMany({ select: { id: true } });
  const results = [];
  for (const { id } of shards) {
    results.push(await runDayTickForShard(id));
    const reclaim = await reclaimInactiveLegends(id);
    if (reclaim.reclaimed) results[results.length - 1].legendsReclaimed = reclaim.reclaimed;
  }
  return results;
}
