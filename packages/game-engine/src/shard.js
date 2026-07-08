import { BOT_TEAM_DEFS, LEAGUE_NAME, TEAMS_PER_SHARD } from "./constants.js";
import { genManager, genPlayer, genSquad, rand, uid } from "./players.js";
import { buildSeasonFixtures, emptyStanding } from "./league.js";
import { buildLegendSquadForTeam } from "./legend-squad.js";
import { DIVISION_NAMES } from "../../../game-version.js";

export function createBotClub(def, shardId, index) {
  const id = uid("bot");
  return {
    id,
    shardId,
    name: def.name,
    shortCode: def.short,
    logoIndex: index % 10,
    primaryColor: def.color,
    secondaryColor: "#f2f0e6",
    budget: rand(1500000, 4000000),
    tier: def.tier,
    formation: "4-4-2",
    chemistry: 50,
    isBot: true,
    autoMode: true,
    manager: genManager(),
    players: genSquad(id, def.tier),
    standing: emptyStanding(id),
  };
}

export function createUserClub(config, shardId) {
  const id = uid("club");
  const club = {
    id,
    shardId,
    name: config.name,
    shortCode: config.short,
    logoIndex: config.logoIndex ?? 0,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor ?? "#f2f0e6",
    shirtColor: config.shirtColor,
    shortsColor: config.shortsColor,
    budget: 500_000_000,
    tier: -3,
    formation: "4-4-2",
    chemistry: 50,
    isBot: false,
    autoMode: true,
    manager: genManager(),
    players: genSquad(id, -3),
    standing: emptyStanding(id),
  };
  return club;
}

export function createShardWithUserClub(userClubConfig, division = 1) {
  const shardId = uid("shard");
  const botsNeeded = TEAMS_PER_SHARD - 1;
  const bots = BOT_TEAM_DEFS.slice(0, botsNeeded).map((def, i) => createBotClub(def, shardId, i));
  const userClub = createUserClub(userClubConfig, shardId);
  const clubs = [...bots, userClub];
  const clubIds = clubs.map((c) => c.id);
  const fixtures = buildSeasonFixtures(clubIds);

  return {
    shard: {
      id: shardId,
      name: DIVISION_NAMES[division] ?? LEAGUE_NAME,
      division,
      seasonNumber: 1,
      dayNumber: 1,
    },
    clubs,
    fixtures,
    userClubId: userClub.id,
  };
}

/** ชาร์ดบอทล้วน 16 ทีม ไม่มีผู้เล่นจริงเลย — เปิดไว้เป็น "แชนแนล" รอผู้เล่นจริงเข้ามาแทนที่บอททีละคน
 * (createClubForUser ฝั่งเซิร์ฟเวอร์จะหาชาร์ดที่ isFull=false แล้วสลับบอทตัวหนึ่งเป็นผู้เล่นจริง แทนที่จะสร้างชาร์ดส่วนตัวให้ทุกคน) */
export function createBotOnlyShard(division = 1) {
  const shardId = uid("shard");
  const bots = BOT_TEAM_DEFS.slice(0, TEAMS_PER_SHARD).map((def, i) => createBotClub(def, shardId, i));
  const clubIds = bots.map((c) => c.id);
  const fixtures = buildSeasonFixtures(clubIds);
  return {
    shard: {
      id: shardId,
      name: DIVISION_NAMES[division] ?? LEAGUE_NAME,
      division,
      seasonNumber: 1,
      dayNumber: 1,
    },
    clubs: bots,
    fixtures,
  };
}

/** ห้องเดียวของ Master Legend League — 16 ทีมซูเปอร์สตาร์จริงจาก roster-database (ไม่ใช่บอทสุ่ม)
 * ใช้ buildLegendSquadForTeam ตัวเดียวกับที่ sandbox career ใช้อยู่แล้ว (roster เต็มถ้ามี ไม่งั้น fallback
 * genSquad + วางซูเปอร์สตาร์ทับ) เพื่อให้ rating/ทีมตรงกับฐานข้อมูล roster-database เป๊ะ ไม่ประดิษฐ์สูตรใหม่ */
export function createLegendBotClub(teamDef, shardId, index, legendLeagueId, startDay) {
  const id = uid("bot");
  const players = buildLegendSquadForTeam(id, legendLeagueId, teamDef.key, teamDef.tier, startDay);
  return {
    id,
    shardId,
    name: teamDef.name,
    shortCode: teamDef.short,
    logoIndex: index % 10,
    primaryColor: teamDef.color,
    secondaryColor: "#f2f0e6",
    budget: rand(5000000, 15000000),
    tier: teamDef.tier,
    formation: teamDef.formation || "4-4-2",
    chemistry: 50,
    isBot: true,
    autoMode: true,
    manager: genManager(),
    players,
    standing: emptyStanding(id),
    // ติดตามว่าสล็อตนี้ในห้อง Master Legend League คือทีมตำนานตัวไหน — ใช้คืนตัวตนทีมเดิมกลับมา
    // เวลามีคนเข้ามาครองสล็อตนี้แล้วภายหลังตกชั้นออกไป (ไม่งั้นชื่อทีมตำนานจะหายไปถาวรหลังมีคนออกครั้งแรก)
    legendTeamKey: teamDef.key,
    legendLeagueId,
  };
}

export function createLegendShard(legendLeagueId, teamDefs, division = 0, startDay = 1) {
  const shardId = uid("shard");
  const clubs = teamDefs.map((t, i) => createLegendBotClub(t, shardId, i, legendLeagueId, startDay));
  const clubIds = clubs.map((c) => c.id);
  const fixtures = buildSeasonFixtures(clubIds);
  return {
    shard: {
      id: shardId,
      name: DIVISION_NAMES[division] ?? "Master Legend League",
      division,
      seasonNumber: 1,
      dayNumber: 1,
      legendLeagueId,
      isLegendShard: true,
    },
    clubs,
    fixtures,
  };
}

/** สโมสรบอทตัวเดียว — ใช้ถมช่องว่างที่เหลือจากทีมที่เลื่อน/ตกชั้นออกจากชาร์ด (กันชาร์ดเหลือไม่ครบ 16) */
export function createSingleBotClub(shardId, existingShortCodes = []) {
  const def = BOT_TEAM_DEFS.find((d) => !existingShortCodes.includes(d.short)) || BOT_TEAM_DEFS[0];
  return createBotClub(def, shardId, existingShortCodes.length);
}

export function joinOpenShard(existingBots, userClubConfig, shardMeta) {
  const userClub = createUserClub(userClubConfig, shardMeta.id);
  const needed = TEAMS_PER_SHARD - existingBots.length - 1;
  const extraBots = BOT_TEAM_DEFS.slice(existingBots.length, existingBots.length + needed)
    .map((def, i) => createBotClub(def, shardMeta.id, existingBots.length + i));
  const clubs = [...existingBots, ...extraBots, userClub];
  const clubIds = clubs.map((c) => c.id);
  return {
    clubs,
    fixtures: buildSeasonFixtures(clubIds),
    userClubId: userClub.id,
  };
}
