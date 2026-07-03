import { prisma } from "../db.js";
import {
  LEGEND_PLAYERS,
  LEGEND_INACTIVE_DAYS,
  LEGEND_ACQUIRE_MIN_TEAM_VALUE,
  canBidForLegend,
  getLegendById,
} from "../../../legend-universe.js";

export async function listLegendsForShard(shardId) {
  const shard = await prisma.leagueShard.findUnique({
    where: { id: shardId },
    include: {
      clubs: { include: { players: true, standing: true } },
    },
  });
  if (!shard?.legendLeagueId) return [];
  const legends = LEGEND_PLAYERS.filter((l) => l.leagueId === shard.legendLeagueId);
  return legends.map((def) => {
    const player = shard.clubs.flatMap((c) => c.players).find((p) => p.legendId === def.legendId);
    const ownerClub = player ? shard.clubs.find((c) => c.id === player.clubId) : null;
    return { def, player, ownerClub };
  });
}

export async function acquireLegend(userId, legendId) {
  const club = await prisma.club.findFirst({
    where: { userId },
    include: { shard: { include: { clubs: { include: { players: true, standing: true } } } }, standing: true, players: true },
  });
  if (!club) throw new Error("ไม่พบสโมสร");
  const def = getLegendById(legendId);
  if (!def || def.leagueId !== club.shard.legendLeagueId) throw new Error("ไม่พบซูเปอร์สตาร์ในลีกนี้");
  if (!canBidForLegend(club.division ?? 1)) throw new Error("ต้องอยู่ Master League");

  const squadValue = club.players.reduce((s, p) => s + p.value, 0);
  const teamValue = squadValue + club.budget;
  if (teamValue < LEGEND_ACQUIRE_MIN_TEAM_VALUE) throw new Error("มูลค่าสโมสรไม่ถึง");

  const legendPlayer = await prisma.player.findFirst({ where: { legendId } });
  if (!legendPlayer) throw new Error("ไม่พบนักเตะ");
  if (legendPlayer.clubId === club.id) throw new Error("มีอยู่แล้ว");
  if (club.budget < def.acquireCost) throw new Error("งบไม่พอ");

  await prisma.$transaction([
    prisma.club.update({ where: { id: club.id }, data: { budget: club.budget - def.acquireCost } }),
    prisma.player.update({
      where: { id: legendPlayer.id },
      data: { clubId: club.id, ownerLastSeenDay: club.shard.dayNumber },
    }),
  ]);

  return { ok: true, legendId, cost: def.acquireCost };
}

export async function reclaimInactiveLegends(shardId) {
  const shard = await prisma.leagueShard.findUnique({
    where: { id: shardId },
    include: { clubs: { include: { players: true } } },
  });
  if (!shard?.legendLeagueId) return { reclaimed: 0 };

  let reclaimed = 0;
  const legends = LEGEND_PLAYERS.filter((l) => l.leagueId === shard.legendLeagueId);

  for (const def of legends) {
    const player = await prisma.player.findFirst({ where: { legendId: def.legendId } });
    if (!player || !player.homeClubId || player.clubId === player.homeClubId) continue;
    const ownerClub = shard.clubs.find((c) => c.id === player.clubId);
    if (ownerClub?.userId) {
      await prisma.player.update({
        where: { id: player.id },
        data: { ownerLastSeenDay: shard.dayNumber },
      });
      continue;
    }
    const lastSeen = player.ownerLastSeenDay ?? shard.dayNumber;
    if (shard.dayNumber - lastSeen < LEGEND_INACTIVE_DAYS) continue;
    await prisma.player.update({
      where: { id: player.id },
      data: { clubId: player.homeClubId, ownerLastSeenDay: shard.dayNumber },
    });
    reclaimed += 1;
  }
  return { reclaimed };
}
