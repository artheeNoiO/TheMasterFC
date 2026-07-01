import {
  TEAMS_PER_SHARD,
  getBestXI,
  simulateInstant,
  applyMatchWear,
  recoverStaminaAll,
  buildSeasonFixtures,
  emptyStanding,
  isSeasonComplete,
  createShardWithUserClub,
} from "@siam/game-engine";
import { prisma } from "../db.js";

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
  const finances = computeClubFinances(club, club.players);
  return { ...club, finances };
}

export async function createClubForUser(userId, config) {
  const existing = await prisma.club.findFirst({ where: { userId } });
  if (existing) throw new Error("มีสโมสรแล้ว");

  let shard = await prisma.leagueShard.findFirst({
    where: { isFull: false },
    include: { clubs: { include: { standing: true, players: true } } },
  });

  if (!shard || shard.clubs.length >= TEAMS_PER_SHARD) {
    const world = createShardWithUserClub(config);
    shard = await prisma.leagueShard.create({
      data: {
        id: world.shard.id,
        name: world.shard.name,
        division: world.shard.division,
        seasonNumber: world.shard.seasonNumber,
        dayNumber: world.shard.dayNumber,
        isFull: true,
        clubs: {
          create: world.clubs.map((c) => ({
            id: c.id,
            userId: c.id === world.userClubId ? userId : null,
            name: c.name,
            shortCode: c.shortCode,
            logoIndex: c.logoIndex,
            primaryColor: c.primaryColor,
            secondaryColor: c.secondaryColor,
            shirtColor: c.shirtColor ?? null,
            shortsColor: c.shortsColor ?? null,
            budget: c.budget,
            tier: c.tier,
            formation: c.formation,
            chemistry: c.chemistry,
            isBot: c.isBot,
            managerJson: JSON.stringify(c.manager),
            players: {
              create: c.players.map((p) => ({
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
              })),
            },
            standing: {
              create: {
                played: c.standing.played,
                w: c.standing.w,
                d: c.standing.d,
                l: c.standing.l,
                gf: c.standing.gf,
                ga: c.standing.ga,
                pts: c.standing.pts,
              },
            },
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
      include: { clubs: true },
    });
    return prisma.club.findFirst({
      where: { userId },
      include: { shard: true, standing: true, players: true },
    }).then((club) => club ? { ...club, finances: computeClubFinances(club, club.players) } : null);
  }

  throw new Error("Shard join not implemented in MVP — new shard created instead");
}

export async function getLeagueTable(shardId) {
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
      userId: s.club.userId,
    },
  }));
}

export async function getTodayMatches(shardId, dayNumber) {
  return prisma.match.findMany({
    where: { shardId, dayNumber },
    include: {
      homeClub: { select: { id: true, name: true, shortCode: true, primaryColor: true } },
      awayClub: { select: { id: true, name: true, shortCode: true, primaryColor: true } },
    },
  });
}

export async function runDayTickForShard(shardId) {
  const shard = await prisma.leagueShard.findUnique({ where: { id: shardId } });
  if (!shard) return { skipped: true };

  if (isSeasonComplete(shard.dayNumber)) {
    await startNewSeason(shardId);
    return { shardId, action: "new_season" };
  }

  const matches = await prisma.match.findMany({
    where: { shardId, dayNumber: shard.dayNumber, played: false },
  });
  if (matches.length === 0) {
    await prisma.leagueShard.update({
      where: { id: shardId },
      data: { dayNumber: shard.dayNumber + 1 },
    });
    return { shardId, action: "advanced_day", day: shard.dayNumber + 1 };
  }

  const clubs = await prisma.club.findMany({
    where: { shardId },
    include: { players: true, standing: true },
  });
  const clubsById = Object.fromEntries(clubs.map((c) => [c.id, c]));
  const allPlayers = clubs.flatMap((c) => c.players.map(playerToEngine));

  for (const match of matches) {
    const homeClub = clubsById[match.homeClubId];
    const awayClub = clubsById[match.awayClubId];
    const homeSquad = allPlayers.filter((p) => p.clubId === match.homeClubId);
    const awaySquad = allPlayers.filter((p) => p.clubId === match.awayClubId);
    const homeXI = getBestXI(homeSquad, homeClub.formation);
    const awayXI = getBestXI(awaySquad, awayClub.formation);
    const { homeGoals, awayGoals } = simulateInstant(
      clubToEngine(homeClub), homeSquad, homeXI,
      clubToEngine(awayClub), awaySquad, awayXI,
      homeClub.chemistry, awayClub.chemistry,
    );

    await prisma.match.update({
      where: { id: match.id },
      data: { played: true, homeGoals, awayGoals },
    });

    const homeStand = homeClub.standing;
    const awayStand = awayClub.standing;
    await prisma.standing.update({
      where: { id: homeStand.id },
      data: applyStandingResult(homeStand, homeGoals, awayGoals),
    });
    await prisma.standing.update({
      where: { id: awayStand.id },
      data: applyStandingResult(awayStand, awayGoals, homeGoals),
    });

    applyMatchWear(homeSquad, homeXI);
    applyMatchWear(awaySquad, awayXI);
  }

  recoverStaminaAll(allPlayers);
  await persistPlayers(allPlayers);

  await prisma.leagueShard.update({
    where: { id: shardId },
    data: { dayNumber: shard.dayNumber + 1 },
  });

  return { shardId, action: "simulated", day: shard.dayNumber, matches: matches.length };
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
  await prisma.leagueShard.update({
    where: { id: shardId },
    data: { seasonNumber: shard.seasonNumber + 1, dayNumber: 1 },
  });
}

export async function runDayTickAll() {
  const shards = await prisma.leagueShard.findMany({ select: { id: true } });
  const results = [];
  for (const { id } of shards) {
    results.push(await runDayTickForShard(id));
  }
  return results;
}
