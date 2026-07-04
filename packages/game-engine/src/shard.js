import { BOT_TEAM_DEFS, LEAGUE_NAME, TEAMS_PER_SHARD } from "./constants.js";
import { genManager, genPlayer, genSquad, rand, uid } from "./players.js";
import { buildSeasonFixtures, emptyStanding } from "./league.js";

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

export function createShardWithUserClub(userClubConfig) {
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
      name: LEAGUE_NAME,
      division: 1,
      seasonNumber: 1,
      dayNumber: 1,
    },
    clubs,
    fixtures,
    userClubId: userClub.id,
  };
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
