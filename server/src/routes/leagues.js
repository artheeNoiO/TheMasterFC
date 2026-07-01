import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getClubForUser, getLeagueTable, getTodayMatches } from "../services/gameService.js";

const router = Router();

router.get("/:shardId/table", requireAuth, async (req, res) => {
  const table = await getLeagueTable(req.params.shardId);
  res.json({ table });
});

router.get("/:shardId/fixtures/today", requireAuth, async (req, res) => {
  const club = await getClubForUser(req.user.id);
  if (!club || club.shardId !== req.params.shardId) {
    return res.status(403).json({ error: "ไม่มีสิทธิ์ดูลีกนี้" });
  }
  const matches = await getTodayMatches(club.shardId, club.shard.dayNumber);
  res.json({ day: club.shard.dayNumber, season: club.shard.seasonNumber, matches });
});

export default router;
